const { differenceInSeconds } = require("date-fns");
const promisify = require("node:util").promisify;
const bcrypt = require("bcryptjs");
const { isbot } = require("isbot");
const URL = require("node:url");
const dns = require("node:dns");

const validators = require("./validators.handler");
const map = require("../utils/map.json");
const transporter = require("../mail");
const query = require("../queries");
const queue = require("../queues");
const utils = require("../utils");
const env = require("../env");

const CustomError = utils.CustomError;
const dnsLookup = promisify(dns.lookup);

async function get(req, res) {
    const { limit, skip } = req.context;
    const search = req.query.search;
    const userId = req.user.id;

    const match = {
        user_id: userId
    };

    const [data, total] = await Promise.all([
        query.link.get(match, { limit, search, skip }),
        query.link.total(match, { search })
    ]);

    if (req.isHTML) {
        res.render("partials/links/table", {
            total,
            limit,
            skip,
            links: data.map(utils.sanitize.link_html),
        })
        return;
    }

    return res.send({
        total,
        limit,
        skip,
        data: data.map(utils.sanitize.link),
    });
};

async function getAdmin(req, res) {
    const { limit, skip } = req.context;
    const search = req.query.search;
    const user = req.query.user;
    let domain = req.query.domain;
    const banned = utils.parseBooleanQuery(req.query.banned);
    const anonymous = utils.parseBooleanQuery(req.query.anonymous);
    const has_domain = utils.parseBooleanQuery(req.query.has_domain);

    const match = {
        ...(banned !== undefined && { banned }),
        ...(anonymous !== undefined && { user_id: [anonymous ? "is" : "is not", null] }),
        ...(has_domain !== undefined && { domain_id: [has_domain ? "is not" : "is", null] }),
    };

    // if domain is equal to the defualt domain,
    // it means admins is looking for links with the defualt domain (no custom user domain)
    if (domain === env.DEFAULT_DOMAIN) {
        domain = undefined;
        match.domain_id = null;
    }

    const [data, total] = await Promise.all([
        query.link.getAdmin(match, { limit, search, user, domain, skip }),
        query.link.totalAdmin(match, { search, user, domain })
    ]);

    const links = data.map(utils.sanitize.link_admin);

    if (req.isHTML) {
        res.render("partials/admin/links/table", {
            total,
            total_formatted: total.toLocaleString("en-US"),
            limit,
            skip,
            links,
        })
        return;
    }

    return res.send({
        total,
        limit,
        skip,
        data: links,
    });
};

async function create(req, res) {
    const { reuse, password, customurl, description, target, fetched_domain, expire_in, meta_title, meta_description, meta_image, show_preview } = req.body;
    const domain_id = fetched_domain ? fetched_domain.id : null;

    const targetDomain = utils.removeWww(URL.parse(target).hostname);

    const tasks = await Promise.all([
        reuse &&
        query.link.find({
            target,
            user_id: req.user.id,
            domain_id
        }),
        customurl &&
        query.link.find({
            address: customurl,
            domain_id
        }), !customurl && utils.generateId(query, domain_id),
        validators.bannedDomain(targetDomain),
        validators.bannedHost(targetDomain)
    ]);

    // if "reuse" is true, try to return
    // the existent URL without creating one
    if (tasks[0]) {
        return res.json(utils.sanitize.link(tasks[0]));
    }

    // Check if custom link already exists (case-insensitive)
    if (tasks[1]) {
        const error = "Custom URL is already in use.";
        res.locals.errors = { customurl: error };
        throw new CustomError(error);
    }

    // Create new link
    const address = customurl || tasks[2];
    const link = await query.link.create({
        password,
        address,
        domain_id,
        description,
        target,
        expire_in,
        meta_title,
        meta_description,
        meta_image,
        show_preview,
        user_id: req.user && req.user.id
    });

    link.domain = fetched_domain && fetched_domain.address;

    if (req.isHTML) {
        res.setHeader("HX-Trigger", "reloadMainTable");
        const shortURL = utils.getShortURL(link.address, link.domain);
        return res.render("partials/shortener", {
            link: shortURL.link,
            url: shortURL.url,
        });
    }

    return res
        .status(201)
        .send(utils.sanitize.link({...link }));
}

async function edit(req, res) {
    const link = await query.link.find({
        uuid: req.params.id,
        ...(!req.user.admin && { user_id: req.user.id })
    });

    if (!link) {
        throw new CustomError("Link was not found.");
    }

    let isChanged = false;

    // Handle checkbox fields specially - unchecked checkboxes send 'false' or no value
    const checkboxFields = ['show_preview'];
    checkboxFields.forEach(field => {
        const currentValue = Boolean(link[field]);
        let newValue = false;

        // Handle different checkbox value formats
        if (req.body[field] === 'true' || req.body[field] === true) {
            newValue = true;
        } else if (req.body[field] === 'false' || req.body[field] === false || req.body[field] === undefined) {
            newValue = false;
        }

        if (currentValue !== newValue) {
            req.body[field] = newValue;
            isChanged = true;
        } else {
            delete req.body[field];
        }
    });

    [
        [req.body.address, "address"],
        [req.body.target, "target"],
        [req.body.description, "description"],
        [req.body.expire_in, "expire_in"],
        [req.body.password, "password"],
        [req.body.meta_title, "meta_title"],
        [req.body.meta_description, "meta_description"],
        [req.body.meta_image, "meta_image"]
    ].forEach(([value, name]) => {
        if (!value) {
            if (name === "password" && link.password)
                req.body.password = null;
            else {
                delete req.body[name];
                return;
            }
        }
        if (value === link[name] && name !== "password") {
            delete req.body[name];
            return;
        }
        if (name === "expire_in" && link.expire_in)
            if (Math.abs(differenceInSeconds(utils.parseDatetime(value), utils.parseDatetime(link.expire_in))) < 60)
                return;
        if (name === "password")
            if (value && value.replace(/•/ig, "").length === 0) {
                delete req.body.password;
                return;
            }
        isChanged = true;
    });

    if (!isChanged) {
        throw new CustomError("Should at least update one field.");
    }

    const { address, target, description, expire_in, password, meta_title, meta_description, meta_image, show_preview } = req.body;

    const targetDomain = target && utils.removeWww(URL.parse(target).hostname);
    const domain_id = link.domain_id || null;

    const tasks = await Promise.all([
        address &&
        query.link.find({
            address,
            domain_id
        }),
        target && validators.bannedDomain(targetDomain),
        target && validators.bannedHost(targetDomain)
    ]);

    // Check if custom link already exists (case-insensitive)
    if (tasks[0] && tasks[0].id !== link.id) {
        const error = "Custom URL is already in use.";
        res.locals.errors = { address: error };
        throw new CustomError("Custom URL is already in use.");
    }

    // Update link
    const [updatedLink] = await query.link.update({
        id: link.id
    }, {
        ...(address && { address }),
        ...(description && { description }),
        ...(target && { target }),
        ...(expire_in && { expire_in }),
        ...((password || password === null) && { password }),
        ...(meta_title !== undefined && { meta_title }),
        ...(meta_description !== undefined && { meta_description }),
        ...(meta_image !== undefined && { meta_image }),
        ...(show_preview !== undefined && { show_preview })
    });

    if (req.isHTML) {
        res.render("partials/links/edit", {
            swap_oob: true,
            success: "Link has been updated.",
            ...utils.sanitize.link_html({...updatedLink }),
        });
        return;
    }

    return res.status(200).send(utils.sanitize.link({...updatedLink }));
};

async function editAdmin(req, res) {
    const link = await query.link.find({
        uuid: req.params.id,
        ...(!req.user.admin && { user_id: req.user.id })
    });

    if (!link) {
        throw new CustomError("Link was not found.");
    }

    let isChanged = false;

    // Handle checkbox fields specially - unchecked checkboxes send 'false' or no value
    const checkboxFields = ['show_preview'];
    checkboxFields.forEach(field => {
        const currentValue = Boolean(link[field]);
        let newValue = false;

        // Handle different checkbox value formats
        if (req.body[field] === 'true' || req.body[field] === true) {
            newValue = true;
        } else if (req.body[field] === 'false' || req.body[field] === false || req.body[field] === undefined) {
            newValue = false;
        }

        if (currentValue !== newValue) {
            req.body[field] = newValue;
            isChanged = true;
        } else {
            delete req.body[field];
        }
    });

    [
        [req.body.address, "address"],
        [req.body.target, "target"],
        [req.body.description, "description"],
        [req.body.expire_in, "expire_in"],
        [req.body.password, "password"],
        [req.body.meta_title, "meta_title"],
        [req.body.meta_description, "meta_description"],
        [req.body.meta_image, "meta_image"]
    ].forEach(([value, name]) => {
        if (!value) {
            if (name === "password" && link.password)
                req.body.password = null;
            else {
                delete req.body[name];
                return;
            }
        }
        if (value === link[name] && name !== "password") {
            delete req.body[name];
            return;
        }
        if (name === "expire_in" && link.expire_in)
            if (Math.abs(differenceInSeconds(utils.parseDatetime(value), utils.parseDatetime(link.expire_in))) < 60)
                return;
        if (name === "password")
            if (value && value.replace(/•/ig, "").length === 0) {
                delete req.body.password;
                return;
            }
        isChanged = true;
    });

    if (!isChanged) {
        throw new CustomError("Should at least update one field.");
    }

    const { address, target, description, expire_in, password, meta_title, meta_description, meta_image, show_preview } = req.body;

    const targetDomain = target && utils.removeWww(URL.parse(target).hostname);
    const domain_id = link.domain_id || null;

    const tasks = await Promise.all([
        address &&
        query.link.find({
            address,
            domain_id
        }),
        target && validators.bannedDomain(targetDomain),
        target && validators.bannedHost(targetDomain)
    ]);

    // Check if custom link already exists (case-insensitive)
    if (tasks[0] && tasks[0].id !== link.id) {
        const error = "Custom URL is already in use.";
        res.locals.errors = { address: error };
        throw new CustomError("Custom URL is already in use.");
    }

    // Update link
    const [updatedLink] = await query.link.update({
        id: link.id
    }, {
        ...(address && { address }),
        ...(description && { description }),
        ...(target && { target }),
        ...(expire_in && { expire_in }),
        ...((password || password === null) && { password }),
        ...(meta_title !== undefined && { meta_title }),
        ...(meta_description !== undefined && { meta_description }),
        ...(meta_image !== undefined && { meta_image }),
        ...(show_preview !== undefined && { show_preview })
    });

    if (req.isHTML) {
        res.render("partials/admin/links/edit", {
            swap_oob: true,
            success: "Link has been updated.",
            ...utils.sanitize.link_admin({...updatedLink }),
        });
        return;
    }

    return res.status(200).send(utils.sanitize.link({...updatedLink }));
};

async function remove(req, res) {
    const { error, isRemoved, link } = await query.link.remove({
        uuid: req.params.id,
        ...(!req.user.admin && { user_id: req.user.id })
    });

    if (!isRemoved) {
        const messsage = error || "Could not delete the link.";
        throw new CustomError(messsage);
    }

    if (req.isHTML) {
        res.setHeader("HX-Reswap", "outerHTML");
        res.setHeader("HX-Trigger", "reloadMainTable");
        res.render("partials/links/dialog/delete_success", {
            link: utils.getShortURL(link.address, link.domain).link,
        });
        return;
    }

    return res
        .status(200)
        .send({ message: "Link has been deleted successfully." });
};



async function ban(req, res) {
    const { id } = req.params;

    const update = {
        banned_by_id: req.user.id,
        banned: true
    };

    // 1. check if link exists
    const link = await query.link.find({ uuid: id });

    if (!link) {
        throw new CustomError("No link has been found.", 400);
    }

    if (link.banned) {
        throw new CustomError("Link has been banned already.", 400);
    }

    const tasks = [];

    // 2. ban link
    tasks.push(query.link.update({ uuid: id }, update));

    const domain = utils.removeWww(URL.parse(link.target).hostname);

    // 3. ban target's domain
    if (req.body.domain) {
        tasks.push(query.domain.add({...update, address: domain }));
    }

    // 4. ban target's host
    if (req.body.host) {
        const dnsRes = await dnsLookup(domain).catch(() => {
            throw new CustomError("Couldn't fetch DNS info.");
        });
        const host = dnsRes && dnsRes.address;
        tasks.push(query.host.add({...update, address: host }));
    }

    // 5. ban link owner
    if (req.body.user && link.user_id) {
        tasks.push(query.user.update({ id: link.user_id }, update));
    }

    // 6. ban all of owner's links
    if (req.body.userLinks && link.user_id) {
        tasks.push(query.link.update({ user_id: link.user_id }, update));
    }

    // 7. wait for all tasks to finish
    await Promise.all(tasks).catch((err) => {
        throw new CustomError("Couldn't ban entries.");
    });

    // 8. send response
    if (req.isHTML) {
        res.setHeader("HX-Reswap", "outerHTML");
        res.setHeader("HX-Trigger", "reloadMainTable");
        res.render("partials/links/dialog/ban_success", {
            link: utils.getShortURL(link.address, link.domain).link,
        });
        return;
    }

    return res.status(200).send({ message: "Banned link successfully." });
};

async function redirect(req, res, next) {
    const isPreservedUrl = utils.preservedURLs.some(
        item => item === req.path.replace("/", "")
    );

    if (isPreservedUrl) return next();

    // 1. If custom domain, get domain info
    const host = utils.removeWww(req.headers.host);
    const domain =
        host !== env.DEFAULT_DOMAIN ?
        await query.domain.find({ address: host }) :
        null;

    // 2. Get link
    const address = req.params.id.replace("+", "");
    const link = await query.link.find({
        address,
        domain_id: domain ? domain.id : null
    });

    // 3. When no link, if has domain redirect to domain's homepage
    // otherwise redirect to 404
    if (!link) {
        return res.redirect((domain && domain.homepage) || "/404");
    }

    // 4. If link is banned, redirect to banned page.
    if (link.banned) {
        return res.redirect("/banned");
    }

    // 5. If wants to see link info, then redirect
    const isRequestingInfo = /.*\+$/gi.test(req.params.id);
    if (isRequestingInfo && !link.password) {
        if (req.isHTML) {
            res.render("url_info", {
                title: "Short link information",
                target: link.target,
                link: utils.getShortURL(link.address, link.domain).link
            });
            return;
        }
        return res.send({ target: link.target });
    }

    // 6. If link is protected, redirect to password page
    if (link.password) {
        if ("authorization" in req.headers) {
            const auth = req.headers.authorization;
            const firstSpace = auth.indexOf(" ");
            if (firstSpace !== -1) {
                const method = auth.slice(0, firstSpace);
                const payload = auth.slice(firstSpace + 1);
                if (method === "Basic") {
                    const decoded = Buffer.from(payload, "base64").toString("utf8");
                    const colon = decoded.indexOf(":");
                    if (colon !== -1) {
                        const password = decoded.slice(colon + 1);
                        const matches = await bcrypt.compare(password, link.password);
                        if (matches) return res.redirect(link.target);
                    }
                }
            }
        }
        res.render("protected", {
            title: "Protected short link",
            id: link.uuid
        });
        return;
    }

    // 7. Enhanced bot detection for comprehensive social media compatibility
    const userAgent = req.headers["user-agent"] || "";
    const isSocialBot = /facebookexternalhit|facebookcatalog|twitterbot|linkedinbot|slackbot|whatsapp|telegrambot|discordbot|skypebot|applebot|googlebot|bingbot|yandexbot|pinterest|instagram|snapchat|socialsharepreview|preview|crawler|bot|spider|scraper|linkpreview|previewbot|socialbot|metabot|ogbot|cardbot|sharebot/i.test(userAgent);

    // Enhanced iMessage detection - more specific to actual iMessage previews
    const isIMessagePreview = (
        // CFNetwork is used by iOS system for link previews
        /cfnetwork/i.test(userAgent) ||
        // Darwin requests are often system-level
        (/darwin/i.test(userAgent) && !/safari|chrome|firefox/i.test(userAgent)) ||
        // iOS devices without Safari/Version (likely system requests)
        (/iphone|ipad|ipod/i.test(userAgent) &&
            !/safari|version|chrome|firefox|opera/i.test(userAgent) &&
            /mobile/i.test(userAgent) &&
            /webkit/i.test(userAgent))
    );

    // Check for specific preview tools and social media apps
    const isPreviewTool = /socialsharepreview|linkpreview|previewbot|metabot|ogbot|cardbot|sharebot/i.test(userAgent);

    // Enhanced detection for messaging apps (excluding iMessage which is handled separately)
    const isMessagingApp = /whatsapp|telegram|line|wechat|viber|signal/i.test(userAgent);



    // Check if we should serve metadata preview
    const hasMetadata = link.meta_title || link.meta_description || link.meta_image;

    if (hasMetadata) {
        // Determine if we should show the preview page with enhanced logic:
        // 1. Always show for social media bots and crawlers (they need metadata)
        // 2. Always show for iMessage previews (critical for iOS link previews)
        // 3. Always show for preview tools and messaging apps
        // 4. Show for regular users (including mobile Safari) ONLY if show_preview is enabled
        const shouldShowPreview = isSocialBot || isIMessagePreview || isPreviewTool || isMessagingApp || link.show_preview;

        if (shouldShowPreview) {
            const domain = link.domain || env.DEFAULT_DOMAIN;
            const shortUrl = `https://${domain}/${link.address}`;

            // Enhanced redirect delay logic:
            // - 0 for social media bots and preview tools (no redirect - they just read metadata)
            // - 0 for iMessage previews (they need metadata without redirect for link previews)
            // - 0 for messaging apps (they need to read metadata without redirect)
            // - 3 for regular users when preview is enabled (user preview experience)
            let redirectDelay = 0;
            if (isSocialBot || isIMessagePreview || isPreviewTool || isMessagingApp) {
                redirectDelay = 0; // No redirect for bots, iMessage, tools, and messaging apps
            } else if (link.show_preview) {
                redirectDelay = 3; // User preview experience for regular browsers
            }

            // Set headers for better social media crawler compatibility
            res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
            res.setHeader('Pragma', 'no-cache');
            res.setHeader('Expires', '0');
            res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive, nosnippet');

            // CRITICAL: Disable layout to prevent conflicting meta tags
            res.locals.layout = null;

            // Prepare metadata with robust fallbacks and sanitization
            const metaTitle = (link.meta_title || link.description || `Shared Link`).trim();
            const metaDescription = (link.meta_description || link.description || `Check out this link: ${link.target}`).trim();
            const metaImage = link.meta_image || `https://${env.DEFAULT_DOMAIN}/images/card.png`;

            // Ensure meta title is not empty and doesn't contain site name
            const finalMetaTitle = metaTitle.length > 0 ? metaTitle : `Shared Link`;
            const finalMetaDescription = metaDescription.length > 0 ? metaDescription : `Check out this link: ${link.target}`;

            return res.render("metadata_preview", {
                title: finalMetaTitle,
                meta_title: finalMetaTitle,
                meta_description: finalMetaDescription,
                meta_image: metaImage,
                meta_url: shortUrl,
                target: link.target,
                site_name: finalMetaTitle, // Use the custom title as site name to override default
                domain: env.DEFAULT_DOMAIN,
                timestamp: new Date().toISOString(),
                redirect_delay: redirectDelay
            });
        }
    }

    // 8. Create link visit
    const isBot = isbot(req.headers["user-agent"]);
    if (link.user_id && !isBot) {
        queue.visit.add({
            userAgent: req.headers["user-agent"],
            ip: req.ip,
            country: req.get("cf-ipcountry"),
            referrer: req.get("Referrer"),
            link
        });
    }

    // 9. Redirect to target
    return res.redirect(link.target);
};

async function redirectProtected(req, res) {
    // 1. Get link
    const uuid = req.params.id;
    const link = await query.link.find({ uuid });

    // 2. Throw error if no link
    if (!link || !link.password) {
        throw new CustomError("Couldn't find the link.", 400);
    }

    // 3. Check if password matches
    const matches = await bcrypt.compare(req.body.password, link.password);

    if (!matches) {
        throw new CustomError("Password is not correct.", 401);
    }

    // 4. Create visit
    if (link.user_id) {
        queue.visit.add({
            userAgent: req.headers["user-agent"],
            ip: req.ip,
            country: req.get("cf-ipcountry"),
            referrer: req.get("Referrer"),
            link
        });
    }

    // 5. Send target
    if (req.isHTML) {
        res.setHeader("HX-Redirect", link.target);
        res.render("partials/protected/form", {
            id: link.uuid,
            message: "Redirecting...",
        });
        return;
    }
    return res.status(200).send({ target: link.target });
};

async function redirectCustomDomainHomepage(req, res, next) {
    const host = utils.removeWww(req.headers.host);
    if (host === env.DEFAULT_DOMAIN) {
        next();
        return;
    }

    const path = req.path;
    const pathName = path.replace("/", "").split("/")[0];
    if (
        path === "/" ||
        utils.preservedURLs.includes(pathName)
    ) {
        const domain = await query.domain.find({ address: host });
        if (domain && domain.homepage) {
            res.redirect(302, domain.homepage);
            return;
        }
    }

    next();
};

async function stats(req, res) {
    const { user } = req;
    const uuid = req.params.id;

    const link = await query.link.find({
        ...(!user.admin && { user_id: user.id }),
        uuid
    });

    if (!link) {
        if (req.isHTML) {
            res.setHeader("HX-Redirect", "/404");
            res.status(200).send("");
            return;
        }
        throw new CustomError("Link could not be found.");
    }

    const stats = await query.visit.find({ link_id: link.id }, link.visit_count);

    if (!stats) {
        throw new CustomError("Could not get the short link stats. Try again later.");
    }

    if (req.isHTML) {
        res.render("partials/stats", {
            link: utils.sanitize.link_html(link),
            stats,
            map,
        });
        return;
    }

    return res.status(200).send({
        ...stats,
        ...utils.sanitize.link(link)
    });
};

module.exports = {
    ban,
    create,
    edit,
    editAdmin,
    get,
    getAdmin,
    remove,
    stats,
    redirect,
    redirectProtected,
    redirectCustomDomainHomepage,
}