const domain = require("./domain.queries");
const visit = require("./visit.queries");
const link = require("./link.queries");
const user = require("./user.queries");
const host = require("./host.queries");
const drop = require("./drop.queries");

module.exports = {
    domain,
    drop,
    host,
    link,
    user,
    visit
};