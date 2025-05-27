const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

/**
 * 🚀 GITHUB BUILD INFO SYSTEM
 * Research-based implementation for displaying build status in footer
 * Inspired by modern web applications like GitHub, Vercel, and Netlify
 */

class BuildInfo {
    constructor() {
        this.cache = null;
        this.cacheTime = null;
        this.cacheDuration = 5 * 60 * 1000; // 5 minutes cache
    }

    /**
     * Get comprehensive build information
     * @returns {Object} Build info object
     */
    getBuildInfo() {
        // Return cached data if still valid
        if (this.cache && this.cacheTime && (Date.now() - this.cacheTime) < this.cacheDuration) {
            return this.cache;
        }

        try {
            const buildInfo = {
                // Git information
                commitHash: this.getCommitHash(),
                commitHashShort: this.getCommitHashShort(),
                branch: this.getBranch(),
                commitDate: this.getCommitDate(),
                commitMessage: this.getCommitMessage(),
                
                // Build information
                buildDate: new Date().toISOString(),
                nodeVersion: process.version,
                
                // Repository information
                repoUrl: this.getRepoUrl(),
                
                // Status
                isDirty: this.isWorkingDirectoryDirty(),
                
                // Display information
                displayText: this.generateDisplayText(),
                githubUrl: this.generateGitHubUrl()
            };

            // Cache the result
            this.cache = buildInfo;
            this.cacheTime = Date.now();

            return buildInfo;
        } catch (error) {
            console.warn('⚠️ Could not get build info:', error.message);
            return this.getFallbackBuildInfo();
        }
    }

    /**
     * Get current commit hash (full)
     */
    getCommitHash() {
        try {
            return execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
        } catch (error) {
            return null;
        }
    }

    /**
     * Get current commit hash (short)
     */
    getCommitHashShort() {
        try {
            return execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim();
        } catch (error) {
            return null;
        }
    }

    /**
     * Get current branch name
     */
    getBranch() {
        try {
            return execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim();
        } catch (error) {
            return null;
        }
    }

    /**
     * Get commit date
     */
    getCommitDate() {
        try {
            const timestamp = execSync('git log -1 --format=%ct', { encoding: 'utf8' }).trim();
            return new Date(parseInt(timestamp) * 1000).toISOString();
        } catch (error) {
            return null;
        }
    }

    /**
     * Get commit message (first line only)
     */
    getCommitMessage() {
        try {
            return execSync('git log -1 --pretty=%s', { encoding: 'utf8' }).trim();
        } catch (error) {
            return null;
        }
    }

    /**
     * Get repository URL
     */
    getRepoUrl() {
        try {
            const remoteUrl = execSync('git config --get remote.origin.url', { encoding: 'utf8' }).trim();
            // Convert SSH to HTTPS if needed
            if (remoteUrl.startsWith('git@github.com:')) {
                return remoteUrl.replace('git@github.com:', 'https://github.com/').replace('.git', '');
            }
            return remoteUrl.replace('.git', '');
        } catch (error) {
            return null;
        }
    }

    /**
     * Check if working directory has uncommitted changes
     */
    isWorkingDirectoryDirty() {
        try {
            const status = execSync('git status --porcelain', { encoding: 'utf8' }).trim();
            return status.length > 0;
        } catch (error) {
            return false;
        }
    }

    /**
     * Generate display text for footer
     */
    generateDisplayText() {
        const shortHash = this.getCommitHashShort();
        const branch = this.getBranch();
        const isDirty = this.isWorkingDirectoryDirty();
        
        if (!shortHash) return 'Build info unavailable';
        
        let text = `${shortHash}`;
        if (branch && branch !== 'HEAD') {
            text += ` (${branch})`;
        }
        if (isDirty) {
            text += ' *';
        }
        
        return text;
    }

    /**
     * Generate GitHub URL for commit
     */
    generateGitHubUrl() {
        const repoUrl = this.getRepoUrl();
        const commitHash = this.getCommitHash();
        
        if (!repoUrl || !commitHash) return null;
        
        return `${repoUrl}/commit/${commitHash}`;
    }

    /**
     * Fallback build info when Git is not available
     */
    getFallbackBuildInfo() {
        return {
            commitHash: null,
            commitHashShort: null,
            branch: null,
            commitDate: null,
            commitMessage: null,
            buildDate: new Date().toISOString(),
            nodeVersion: process.version,
            repoUrl: null,
            isDirty: false,
            displayText: 'Development build',
            githubUrl: null
        };
    }

    /**
     * Get formatted build info for display
     */
    getFormattedBuildInfo() {
        const info = this.getBuildInfo();
        
        return {
            text: info.displayText,
            url: info.githubUrl,
            tooltip: this.generateTooltip(info),
            status: this.getStatus(info)
        };
    }

    /**
     * Generate tooltip text
     */
    generateTooltip(info) {
        const parts = [];
        
        if (info.commitMessage) {
            parts.push(`Commit: ${info.commitMessage}`);
        }
        
        if (info.commitDate) {
            const date = new Date(info.commitDate);
            parts.push(`Date: ${date.toLocaleDateString()} ${date.toLocaleTimeString()}`);
        }
        
        if (info.branch) {
            parts.push(`Branch: ${info.branch}`);
        }
        
        if (info.isDirty) {
            parts.push('⚠️ Working directory has uncommitted changes');
        }
        
        return parts.join('\n');
    }

    /**
     * Get status indicator
     */
    getStatus(info) {
        if (!info.commitHash) return 'unknown';
        if (info.isDirty) return 'dirty';
        if (info.branch === 'main' || info.branch === 'master') return 'production';
        return 'development';
    }
}

// Export singleton instance
module.exports = new BuildInfo();
