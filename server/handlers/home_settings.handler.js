const query = require("../queries");
const path = require("path");
const fs = require("fs").promises;

// Configure multer for image uploads
let multer, upload;

try {
    multer = require("multer");

    const storage = multer.diskStorage({
        destination: async function(req, file, cb) {
            const uploadDir = path.join(__dirname, "../../static/images/home");
            try {
                await fs.mkdir(uploadDir, { recursive: true });
                cb(null, uploadDir);
            } catch (error) {
                cb(error);
            }
        },
        filename: function(req, file, cb) {
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
            cb(null, 'event-' + uniqueSuffix + path.extname(file.originalname));
        }
    });

    const fileFilter = (req, file, cb) => {
        // Accept only image files
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed!'), false);
        }
    };

    upload = multer({
        storage: storage,
        fileFilter: fileFilter,
        limits: {
            fileSize: 5 * 1024 * 1024 // 5MB limit
        }
    });
} catch (error) {
    console.warn('Multer not installed, file upload will be disabled:', error.message);
    // Fallback for when multer is not installed
    upload = {
        single: () => (req, res, next) => {
            console.warn('File upload attempted but multer is not installed');
            next();
        }
    };
}

async function getAdmin(req, res) {
    try {
        const settings = await query.homeSettings.getForAdmin();

        if (req.isHTML) {
            res.render("partials/admin/home_settings/table", {
                title: "home_settings",
                settings: settings
            });
            return;
        }

        return res.status(200).send(settings);
    } catch (error) {
        console.error("Error fetching home settings:", error);

        if (req.isHTML) {
            res.render("partials/admin/home_settings/table", {
                title: "home_settings",
                error: "Failed to load home settings",
                settings: null
            });
            return;
        }

        return res.status(500).send({ error: "Failed to load home settings" });
    }
}

async function update(req, res) {
    try {
        const updateData = {...req.body };

        // Handle file upload if present
        if (req.file) {
            updateData.event_image = `/images/home/${req.file.filename}`;
        }

        // Convert datetime-local format to proper datetime
        if (updateData.event_date) {
            updateData.event_date = new Date(updateData.event_date);
        }

        const settings = await query.homeSettings.update(updateData, req.user.id);

        if (req.isHTML) {
            res.setHeader("HX-Trigger", "reloadMainTable");
            res.render("partials/admin/home_settings/success", {
                message: "Home page settings updated successfully! Changes are now live on your home page."
            });
            return;
        }

        return res.status(200).send({
            message: "Home page settings updated successfully",
            settings: settings
        });
    } catch (error) {
        console.error("Error updating home settings:", error);

        if (req.isHTML) {
            res.render("partials/admin/home_settings/form", {
                error: "Failed to update home settings",
                settings: req.body
            });
            return;
        }

        return res.status(500).send({ error: "Failed to update home settings" });
    }
}

async function get(req, res) {
    try {
        const settings = await query.homeSettings.get();
        return res.status(200).send(settings);
    } catch (error) {
        console.error("Error fetching home settings:", error);
        return res.status(500).send({ error: "Failed to load home settings" });
    }
}

// 🚀 GET COMPLETE HOMEPAGE DATA FOR REFRESH
async function getHomepageData(req, res) {
    try {
        console.log('🔄 Fetching complete homepage data for refresh...');

        // Get home settings
        const homeSettings = await query.homeSettings.get();

        // Get featured drops
        const featuredDrops = await query.drop.getFeaturedDrops({ limit: 6 });

        // Format the date for display
        let formattedDate = "March 29th, 9:00 P.M.";
        if (homeSettings.event_date) {
            const eventDate = new Date(homeSettings.event_date);
            const options = {
                month: 'long',
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
                hour12: true
            };
            formattedDate = eventDate.toLocaleDateString('en-US', options)
                .replace(',', 'th,'); // Add 'th' suffix
        }

        console.log(`✅ Homepage data refreshed: ${featuredDrops.length} featured drops`);

        return res.status(200).send({
            homeSettings,
            featuredDrops,
            formattedDate,
            totalCards: 1 + featuredDrops.length // 1 default + featured drops
        });
    } catch (error) {
        console.error("Error fetching homepage data:", error);
        return res.status(500).send({ error: "Failed to load homepage data" });
    }
}

module.exports = {
    getAdmin,
    update,
    get,
    getHomepageData,
    upload
};