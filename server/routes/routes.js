const { Router } = require("express");

const helpers = require("./../handlers/helpers.handler");
const locals = require("./../handlers/locals.handler");
const renders = require("./renders.routes");
const domains = require("./domain.routes");
const health = require("./health.routes");
const link = require("./link.routes");
const user = require("./user.routes");
const auth = require("./auth.routes");
const drops = require("./drops.routes");
const publicDrops = require("./public_drops.routes");
const sms = require("./sms.routes");
const analytics = require("./api/analytics.routes");
const contactBook = require("./api/contact-book.routes");
const homeSettings = require("./home_settings.routes");

const renderRouter = Router();
renderRouter.use(renders);
renderRouter.use("/drop", publicDrops);

const apiRouter = Router();
apiRouter.use(locals.noLayout);
apiRouter.use("/domains", domains);
apiRouter.use("/health", health);
apiRouter.use("/links", link);
apiRouter.use("/users", user);
apiRouter.use("/auth", auth);
apiRouter.use("/drops", drops);
apiRouter.use("/sms", sms);
apiRouter.use("/analytics", analytics);
apiRouter.use("/contact-book", contactBook);
apiRouter.use("/home-settings", homeSettings);

module.exports = {
    api: apiRouter,
    render: renderRouter,
};