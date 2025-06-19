const { addMilliseconds } = require("date-fns");
const { body, param, query: queryValidator } = require("express-validator");
const promisify = require("node:util").promisify;
const bcrypt = require("bcryptjs");
const dns = require("node:dns");
const URL = require("node:url");
const ms = require("ms");

const { ROLES } = require("../consts");
const query = require("../queries");
const utils = require("../utils");
const knex = require("../knex");
const env = require("../env");

const dnsLookup = promisify(dns.lookup);

const checkUser = (value, { req }) => !!req.user;
const sanitizeCheckbox = value => value === true || value === "on" || value;

const createLink = [
    body("target")
    .exists({ checkNull: true, checkFalsy: true })
    .withMessage("Target is missing.")
    .isString()
    .trim()
    .isLength({ min: 1, max: 2040 })
    .withMessage("Maximum URL length is 2040.")
    .customSanitizer(utils.addProtocol)
    .custom(value => utils.urlRegex.test(value) || /^(?!https?|ftp)(\w+:|\/\/)/.test(value))
    .withMessage("URL is not valid.")
    .custom(value => utils.removeWww(URL.parse(value).host) !== env.DEFAULT_DOMAIN)
    .withMessage(`${env.DEFAULT_DOMAIN} URLs are not allowed.`),
    body("password")
    .optional({ nullable: true, checkFalsy: true })
    .custom(checkUser)
    .withMessage("Only users can use this field.")
    .isString()
    .isLength({ min: 3, max: 64 })
    .withMessage("Password length must be between 3 and 64."),
    body("customurl")
    .optional({ nullable: true, checkFalsy: true })
    .custom(checkUser)
    .withMessage("Only users can use this field.")
    .isString()
    .trim()
    .isLength({ min: 1, max: 64 })
    .withMessage("Custom URL length must be between 1 and 64.")
    .custom(value => utils.customAddressRegex.test(value) || utils.customAlphabetRegex.test(value))
    .withMessage("Custom URL is not valid.")
    .custom(value => !utils.preservedURLs.some(url => url.toLowerCase() === value))
    .withMessage("You can't use this custom URL."),
    body("reuse")
    .optional({ nullable: true })
    .custom(checkUser)
    .withMessage("Only users can use this field.")
    .isBoolean()
    .withMessage("Reuse must be boolean."),
    body("description")
    .optional({ nullable: true, checkFalsy: true })
    .isString()
    .trim()
    .isLength({ min: 1, max: 2040 })
    .withMessage("Description length must be between 1 and 2040."),
    body("meta_title")
    .optional({ nullable: true, checkFalsy: true })
    .isString()
    .isLength({ min: 0, max: 255 })
    .withMessage("Meta title length must be between 0 and 255."),
    body("meta_description")
    .optional({ nullable: true, checkFalsy: true })
    .isString()
    .isLength({ min: 0, max: 500 })
    .withMessage("Meta description length must be between 0 and 500."),
    body("meta_image")
    .optional({ nullable: true, checkFalsy: true })
    .isString()
    .isLength({ min: 0, max: 2040 })
    .withMessage("Meta image URL length must be between 0 and 2040.")
    .custom(value => !value || utils.urlRegex.test(value))
    .withMessage("Meta image must be a valid URL."),
    body("expire_in")
    .optional({ nullable: true, checkFalsy: true })
    .isString()
    .trim()
    .custom(value => {
        try {
            return !!ms(value);
        } catch {
            return false;
        }
    })
    .withMessage("Expire format is invalid. Valid examples: 1m, 8h, 42 days.")
    .customSanitizer(ms)
    .custom(value => value >= ms("1m"))
    .withMessage("Expire time should be more than 1 minute.")
    .customSanitizer(value => utils.dateToUTC(addMilliseconds(new Date(), value))),
    body("domain")
    .optional({ nullable: true, checkFalsy: true })
    .customSanitizer(value => value === env.DEFAULT_DOMAIN ? null : value)
    .custom(checkUser)
    .withMessage("Only users can use this field.")
    .isString()
    .withMessage("Domain should be string.")
    .customSanitizer(value => value.toLowerCase())
    .custom(async(address, { req }) => {
        const domain = await query.domain.find({
            address,
            user_id: req.user.id
        });
        req.body.fetched_domain = domain || null;

        if (!domain) return Promise.reject();
    })
    .withMessage("You can't use this domain.")
];

const editLink = [
    body("target")
    .optional({ checkFalsy: true, nullable: true })
    .isString()
    .trim()
    .isLength({ min: 1, max: 2040 })
    .withMessage("Maximum URL length is 2040.")
    .customSanitizer(utils.addProtocol)
    .custom(value => utils.urlRegex.test(value) || /^(?!https?|ftp)(\w+:|\/\/)/.test(value))
    .withMessage("URL is not valid.")
    .custom(value => utils.removeWww(URL.parse(value).host) !== env.DEFAULT_DOMAIN)
    .withMessage(`${env.DEFAULT_DOMAIN} URLs are not allowed.`),
    body("password")
    .optional({ nullable: true, checkFalsy: true })
    .isString()
    .isLength({ min: 3, max: 64 })
    .withMessage("Password length must be between 3 and 64."),
    body("address")
    .optional({ checkFalsy: true, nullable: true })
    .isString()
    .trim()
    .isLength({ min: 1, max: 64 })
    .withMessage("Custom URL length must be between 1 and 64.")
    .custom(value => utils.customAddressRegex.test(value) || utils.customAlphabetRegex.test(value))
    .withMessage("Custom URL is not valid")
    .custom(value => !utils.preservedURLs.some(url => url.toLowerCase() === value))
    .withMessage("You can't use this custom URL."),
    body("expire_in")
    .optional({ nullable: true, checkFalsy: true })
    .isString()
    .trim()
    .custom(value => {
        try {
            return !!ms(value);
        } catch {
            return false;
        }
    })
    .withMessage("Expire format is invalid. Valid examples: 1m, 8h, 42 days.")
    .customSanitizer(ms)
    .custom(value => value >= ms("1m"))
    .withMessage("Expire time should be more than 1 minute.")
    .customSanitizer(value => utils.dateToUTC(addMilliseconds(new Date(), value))),
    body("description")
    .optional({ nullable: true, checkFalsy: true })
    .isString()
    .trim()
    .isLength({ min: 0, max: 2040 })
    .withMessage("Description length must be between 0 and 2040."),
    body("meta_title")
    .optional({ nullable: true, checkFalsy: true })
    .isString()
    .isLength({ min: 0, max: 255 })
    .withMessage("Meta title length must be between 0 and 255."),
    body("meta_description")
    .optional({ nullable: true, checkFalsy: true })
    .isString()
    .isLength({ min: 0, max: 500 })
    .withMessage("Meta description length must be between 0 and 500."),
    body("meta_image")
    .optional({ nullable: true, checkFalsy: true })
    .isString()
    .isLength({ min: 0, max: 2040 })
    .withMessage("Meta image URL length must be between 0 and 2040.")
    .custom(value => !value || utils.urlRegex.test(value))
    .withMessage("Meta image must be a valid URL."),
    param("id", "ID is invalid.")
    .exists({ checkFalsy: true, checkNull: true })
    .isLength({ min: 36, max: 36 })
];

const redirectProtected = [
    body("password", "Password is invalid.")
    .exists({ checkFalsy: true, checkNull: true })
    .isString()
    .isLength({ min: 3, max: 64 })
    .withMessage("Password length must be between 3 and 64."),
    param("id", "ID is invalid.")
    .exists({ checkFalsy: true, checkNull: true })
    .isLength({ min: 36, max: 36 })
];

const addDomain = [
    body("address", "Domain is not valid.")
    .exists({ checkFalsy: true, checkNull: true })
    .isLength({ min: 3, max: 64 })
    .withMessage("Domain length must be between 3 and 64.")
    .trim()
    .customSanitizer(utils.addProtocol)
    .custom(value => utils.urlRegex.test(value))
    .customSanitizer(value => {
        const parsed = URL.parse(value);
        return utils.removeWww(parsed.hostname || parsed.href);
    })
    .custom(value => value !== env.DEFAULT_DOMAIN)
    .withMessage("You can't use the default domain.")
    .custom(async value => {
        const domain = await query.domain.find({ address: value });
        if ((domain && domain.user_id) || (domain && domain.banned)) return Promise.reject();
    })
    .withMessage("You can't add this domain."),
    body("homepage")
    .optional({ checkFalsy: true, nullable: true })
    .customSanitizer(utils.addProtocol)
    .custom(value => utils.urlRegex.test(value) || /^(?!https?|ftp)(\w+:|\/\/)/.test(value))
    .withMessage("Homepage is not valid.")
];

const addDomainAdmin = [
    body("address", "Domain is not valid.")
    .exists({ checkFalsy: true, checkNull: true })
    .isLength({ min: 3, max: 64 })
    .withMessage("Domain length must be between 3 and 64.")
    .trim()
    .customSanitizer(utils.addProtocol)
    .custom(value => utils.urlRegex.test(value))
    .customSanitizer(value => {
        const parsed = URL.parse(value);
        return utils.removeWww(parsed.hostname || parsed.href);
    })
    .custom(value => value !== env.DEFAULT_DOMAIN)
    .withMessage("You can't add the default domain.")
    .custom(async value => {
        const domain = await query.domain.find({ address: value });
        if (domain) return Promise.reject();
    })
    .withMessage("Domain already exists."),
    body("homepage")
    .optional({ checkFalsy: true, nullable: true })
    .customSanitizer(utils.addProtocol)
    .custom(value => utils.urlRegex.test(value) || /^(?!https?|ftp)(\w+:|\/\/)/.test(value))
    .withMessage("Homepage is not valid."),
    body("banned")
    .optional({ nullable: true })
    .customSanitizer(sanitizeCheckbox)
    .isBoolean(),
]

const removeDomain = [
    param("id", "ID is invalid.")
    .exists({
        checkFalsy: true,
        checkNull: true
    })
    .isLength({ min: 36, max: 36 })
];

const removeDomainAdmin = [
    param("id", "ID is invalid.")
    .exists({
        checkFalsy: true,
        checkNull: true
    })
    .isNumeric(),
    queryValidator("links")
    .optional({ nullable: true })
    .customSanitizer(sanitizeCheckbox)
    .isBoolean(),
];

const deleteLink = [
    param("id", "ID is invalid.")
    .exists({
        checkFalsy: true,
        checkNull: true
    })
    .isLength({ min: 36, max: 36 })
];



const banLink = [
    param("id", "ID is invalid.")
    .exists({
        checkFalsy: true,
        checkNull: true
    })
    .isLength({ min: 36, max: 36 }),
    body("host", '"host" should be a boolean.')
    .optional({
        nullable: true
    })
    .customSanitizer(sanitizeCheckbox)
    .isBoolean(),
    body("user", '"user" should be a boolean.')
    .optional({
        nullable: true
    })
    .customSanitizer(sanitizeCheckbox)
    .isBoolean(),
    body("userLinks", '"userLinks" should be a boolean.')
    .optional({
        nullable: true
    })
    .customSanitizer(sanitizeCheckbox)
    .isBoolean(),
    body("domain", '"domain" should be a boolean.')
    .optional({
        nullable: true
    })
    .customSanitizer(sanitizeCheckbox)
    .isBoolean()
];

const banUser = [
    param("id", "ID is invalid.")
    .exists({
        checkFalsy: true,
        checkNull: true
    })
    .isNumeric(),
    body("links", '"links" should be a boolean.')
    .optional({
        nullable: true
    })
    .customSanitizer(sanitizeCheckbox)
    .isBoolean(),
    body("domains", '"domains" should be a boolean.')
    .optional({
        nullable: true
    })
    .customSanitizer(sanitizeCheckbox)
    .isBoolean()
];

const banDomain = [
    param("id", "ID is invalid.")
    .exists({
        checkFalsy: true,
        checkNull: true
    })
    .isNumeric(),
    body("links", '"links" should be a boolean.')
    .optional({
        nullable: true
    })
    .customSanitizer(sanitizeCheckbox)
    .isBoolean(),
    body("domains", '"domains" should be a boolean.')
    .optional({
        nullable: true
    })
    .customSanitizer(sanitizeCheckbox)
    .isBoolean()
];

const createUser = [
    body("password", "Password is not valid.")
    .exists({ checkFalsy: true, checkNull: true })
    .isLength({ min: 8, max: 64 })
    .withMessage("Password length must be between 8 and 64."),
    body("email", "Email is not valid.")
    .exists({ checkFalsy: true, checkNull: true })
    .trim()
    .isLength({ min: 1, max: 255 })
    .withMessage("Email length must be max 255.")
    .isEmail()
    .custom(async(value, { req }) => {
        const user = await query.user.find({ email: value });
        if (user)
            return Promise.reject();
    })
    .withMessage("User already exists."),
    body("role", "Role is not valid.")
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .isIn([ROLES.USER, ROLES.ADMIN]),
    body("verified")
    .optional({ nullable: true })
    .customSanitizer(sanitizeCheckbox)
    .isBoolean(),
    body("banned")
    .optional({ nullable: true })
    .customSanitizer(sanitizeCheckbox)
    .isBoolean(),
    body("verification_email")
    .optional({ nullable: true })
    .customSanitizer(sanitizeCheckbox)
    .isBoolean(),
];

const getStats = [
    param("id", "ID is invalid.")
    .exists({
        checkFalsy: true,
        checkNull: true
    })
    .isLength({ min: 36, max: 36 })
];

const signup = [
    body("password", "Password is not valid.")
    .exists({ checkFalsy: true, checkNull: true })
    .isLength({ min: 8, max: 64 })
    .withMessage("Password length must be between 8 and 64."),
    body("email", "Email is not valid.")
    .exists({ checkFalsy: true, checkNull: true })
    .trim()
    .isLength({ min: 0, max: 255 })
    .withMessage("Email length must be max 255.")
    .isEmail()
];

const signupEmailTaken = [
    body("email", "Email is not valid.")
    .custom(async(value, { req }) => {
        const user = await query.user.find({ email: value });

        if (user) {
            req.user = user;
        }

        if (user && user.verified) {
            return Promise.reject();
        }
    })
    .withMessage("You can't use this email address.")
];

const login = [
    body("password", "Password is not valid.")
    .exists({ checkFalsy: true, checkNull: true })
    .isLength({ min: 8, max: 64 })
    .withMessage("Password length must be between 8 and 64."),
    body("email", "Email is not valid.")
    .exists({ checkFalsy: true, checkNull: true })
    .trim()
    .isLength({ min: 1, max: 255 })
    .withMessage("Email length must be max 255.")
    .isEmail()
];

const createAdmin = [
    body("password", "Password is not valid.")
    .exists({ checkFalsy: true, checkNull: true })
    .isLength({ min: 8, max: 64 })
    .withMessage("Password length must be between 8 and 64."),
    body("email", "Email is not valid.")
    .exists({ checkFalsy: true, checkNull: true })
    .trim()
    .isLength({ min: 0, max: 255 })
    .withMessage("Email length must be max 255.")
    .isEmail()
];

const changePassword = [
    body("currentpassword", "Password is not valid.")
    .exists({ checkFalsy: true, checkNull: true })
    .isLength({ min: 8, max: 64 })
    .withMessage("Password length must be between 8 and 64."),
    body("newpassword", "Password is not valid.")
    .exists({ checkFalsy: true, checkNull: true })
    .isLength({ min: 8, max: 64 })
    .withMessage("Password length must be between 8 and 64.")
];

const changeEmail = [
    body("password", "Password is not valid.")
    .exists({ checkFalsy: true, checkNull: true })
    .isLength({ min: 8, max: 64 })
    .withMessage("Password length must be between 8 and 64."),
    body("email", "Email address is not valid.")
    .exists({ checkFalsy: true, checkNull: true })
    .trim()
    .isLength({ min: 1, max: 255 })
    .withMessage("Email length must be max 255.")
    .isEmail()
];

const resetPassword = [
    body("email", "Email is not valid.")
    .exists({ checkFalsy: true, checkNull: true })
    .trim()
    .isLength({ min: 0, max: 255 })
    .withMessage("Email length must be max 255.")
    .isEmail()
];

const newPassword = [
    body("reset_password_token", "Reset password token is invalid.")
    .exists({ checkFalsy: true, checkNull: true })
    .isLength({ min: 36, max: 36 }),
    body("new_password", "Password is not valid.")
    .exists({ checkFalsy: true, checkNull: true })
    .isLength({ min: 8, max: 64 })
    .withMessage("Password length must be between 8 and 64."),
    body("repeat_password", "Password is not valid.")
    .custom((repeat_password, { req }) => {
        return repeat_password === req.body.new_password;
    })
    .withMessage("Passwords don't match."),
];

const deleteUser = [
    body("password", "Password is not valid.")
    .exists({ checkFalsy: true, checkNull: true })
    .isLength({ min: 8, max: 64 })
    .custom(async(password, { req }) => {
        const isMatch = await bcrypt.compare(password, req.user.password);
        if (!isMatch) return Promise.reject();
    })
    .withMessage("Password is not correct.")
];

const deleteUserByAdmin = [
    param("id", "ID is invalid.")
    .exists({ checkFalsy: true, checkNull: true })
    .isNumeric()
];

const updateProfile = [
    body("first_name")
    .optional({ nullable: true, checkFalsy: true })
    .isString()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage("First name length must be between 1 and 50."),
    body("last_name")
    .optional({ nullable: true, checkFalsy: true })
    .isString()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage("Last name length must be between 1 and 50."),
    body("username")
    .optional({ nullable: true, checkFalsy: true })
    .isString()
    .trim()
    .isLength({ min: 3, max: 30 })
    .withMessage("Username length must be between 3 and 30.")
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage("Username can only contain letters, numbers, underscores, and hyphens.")
    .custom(async(value, { req }) => {
        if (!value) return true;
        const user = await query.user.find({ username: value });
        if (user && user.id !== req.user.id) {
            return Promise.reject();
        }
    })
    .withMessage("Username is already taken."),
    body("phone")
    .optional({ nullable: true, checkFalsy: true })
    .isString()
    .trim()
    .matches(/^\+?[\d\s\-\(\)]+$/)
    .withMessage("Phone number format is invalid.")
    .isLength({ min: 10, max: 20 })
    .withMessage("Phone number length must be between 10 and 20."),
    body("company")
    .optional({ nullable: true, checkFalsy: true })
    .isString()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage("Company name length must be between 1 and 100."),
    body("profile_picture")
    .optional({ nullable: true, checkFalsy: true })
    .isString()
    .trim()
    .isURL()
    .withMessage("Profile picture must be a valid URL.")
    .isLength({ min: 1, max: 500 })
    .withMessage("Profile picture URL length must be between 1 and 500.")
];

const updateProfilePassword = [
    body("currentPassword", "Current password is required.")
    .exists({ checkFalsy: true, checkNull: true })
    .isLength({ min: 8, max: 64 })
    .withMessage("Current password length must be between 8 and 64.")
    .custom(async(password, { req }) => {
        const isMatch = await bcrypt.compare(password, req.user.password);
        if (!isMatch) return Promise.reject();
    })
    .withMessage("Current password is not correct."),
    body("newPassword", "New password is required.")
    .exists({ checkFalsy: true, checkNull: true })
    .isLength({ min: 8, max: 64 })
    .withMessage("New password length must be between 8 and 64."),
    body("confirmPassword", "Password confirmation is required.")
    .exists({ checkFalsy: true, checkNull: true })
    .custom((confirmPassword, { req }) => {
        return confirmPassword === req.body.newPassword;
    })
    .withMessage("Passwords do not match.")
];

async function bannedDomain(domain) {
    const isBanned = await query.domain.find({
        address: domain,
        banned: true
    });

    if (isBanned) {
        throw new utils.CustomError("Domain is banned.", 400);
    }
};

async function bannedHost(domain) {
    let isBanned;

    try {
        const dnsRes = await dnsLookup(domain);

        if (!dnsRes || !dnsRes.address) return;

        isBanned = await query.host.find({
            address: dnsRes.address,
            banned: true
        });
    } catch (error) {
        isBanned = null;
    }

    if (isBanned) {
        throw new utils.CustomError("URL is containing malware/scam.", 400);
    }
};

const updateHomeSettings = [
    body("event_title")
    .optional({ nullable: true, checkFalsy: false })
    .isString()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage("Event title must be between 1 and 50 characters.")
    .matches(/^[a-zA-Z0-9\s\-_!@#$%^&*()+={}[\]:";'<>?,./]+$/)
    .withMessage("Event title contains invalid characters."),

    body("artist_name")
    .optional({ nullable: true, checkFalsy: false })
    .isString()
    .trim()
    .isLength({ min: 1, max: 30 })
    .withMessage("Artist name must be between 1 and 30 characters.")
    .matches(/^[a-zA-Z0-9\s\-_&]+$/)
    .withMessage("Artist name can only contain letters, numbers, spaces, hyphens, underscores, and ampersands."),

    body("event_date")
    .optional({ nullable: true, checkFalsy: false })
    .isISO8601()
    .withMessage("Event date must be a valid date and time.")
    .custom((value) => {
        if (value) {
            const eventDate = new Date(value);
            const now = new Date();
            if (eventDate < now) {
                throw new Error("Event date cannot be in the past.");
            }
        }
        return true;
    }),

    body("event_address")
    .optional({ nullable: true, checkFalsy: false })
    .isString()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage("Event address must be between 1 and 100 characters.")
    .matches(/^[a-zA-Z0-9\s\-_,.'#]+$/)
    .withMessage("Event address contains invalid characters."),

    body("tickets_url")
    .optional({ nullable: true, checkFalsy: false })
    .isString()
    .trim()
    .isLength({ min: 1, max: 500 })
    .withMessage("Tickets URL must be between 1 and 500 characters.")
    .isURL({ protocols: ['http', 'https'], require_protocol: true })
    .withMessage("Tickets URL must be a valid HTTP or HTTPS URL."),

    body("instagram_url")
    .optional({ nullable: true, checkFalsy: false })
    .isString()
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage("Instagram URL must be between 1 and 200 characters.")
    .isURL({ protocols: ['http', 'https'], require_protocol: true })
    .withMessage("Instagram URL must be a valid HTTP or HTTPS URL.")
    .custom((value) => {
        if (value && !value.includes('instagram.com')) {
            throw new Error("Instagram URL must be from instagram.com domain.");
        }
        return true;
    }),

    body("tiktok_url")
    .optional({ nullable: true, checkFalsy: false })
    .isString()
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage("TikTok URL must be between 1 and 200 characters.")
    .isURL({ protocols: ['http', 'https'], require_protocol: true })
    .withMessage("TikTok URL must be a valid HTTP or HTTPS URL.")
    .custom((value) => {
        if (value && !value.includes('tiktok.com')) {
            throw new Error("TikTok URL must be from tiktok.com domain.");
        }
        return true;
    }),

    body("twitter_url")
    .optional({ nullable: true, checkFalsy: false })
    .isString()
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage("Twitter URL must be between 1 and 200 characters.")
    .isURL({ protocols: ['http', 'https'], require_protocol: true })
    .withMessage("Twitter URL must be a valid HTTP or HTTPS URL.")
    .custom((value) => {
        if (value && !(value.includes('twitter.com') || value.includes('x.com'))) {
            throw new Error("Twitter URL must be from twitter.com or x.com domain.");
        }
        return true;
    }),

    body("email_url")
    .optional({ nullable: true, checkFalsy: false })
    .isString()
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage("Email URL must be between 1 and 200 characters.")
    .custom((value) => {
        if (value) {
            // Allow mailto: links or regular URLs
            if (!value.startsWith('mailto:') && !value.match(/^https?:\/\//)) {
                throw new Error("Email URL must be a mailto: link or a valid HTTP/HTTPS URL.");
            }
            if (value.startsWith('mailto:')) {
                const email = value.replace('mailto:', '');
                if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
                    throw new Error("Invalid email address in mailto: link.");
                }
            }
        }
        return true;
    })
];

module.exports = {
    addDomain,
    addDomainAdmin,
    banDomain,
    banLink,
    banUser,
    bannedDomain,
    bannedHost,
    changeEmail,
    changePassword,
    checkUser,
    createAdmin,
    createLink,
    createUser,
    deleteLink,
    deleteUser,
    deleteUserByAdmin,
    editLink,
    getStats,
    login,
    newPassword,
    redirectProtected,
    removeDomain,
    removeDomainAdmin,
    resetPassword,
    signup,
    signupEmailTaken,
    updateProfile,
    updateProfilePassword,
    updateHomeSettings,
}