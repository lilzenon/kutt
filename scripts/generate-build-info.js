#!/usr/bin/env node

/**
 * 🏗️ BUILD INFO GENERATION SCRIPT
 * 
 * This script generates build information during the build process
 * and saves it to a JSON file that can be read in production.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function generateBuildInfo() {
    console.log('🏗️ Generating build information...');
    
    const buildInfo = {
        buildDate: new Date().toISOString(),
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch
    };
    
    try {
        // Try to get Git information
        console.log('📡 Attempting to get Git information...');
        
        // Get commit hash
        try {
            const commitHash = execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
            buildInfo.commitHash = commitHash;
            buildInfo.commitHashShort = commitHash.substring(0, 7);
            console.log(`✅ Commit hash: ${buildInfo.commitHashShort}`);
        } catch (error) {
            console.warn('⚠️ Could not get commit hash:', error.message);
        }
        
        // Get branch name
        try {
            const branch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim();
            buildInfo.branch = branch;
            console.log(`✅ Branch: ${branch}`);
        } catch (error) {
            console.warn('⚠️ Could not get branch name:', error.message);
        }
        
        // Get commit date
        try {
            const commitDate = execSync('git log -1 --format=%ci', { encoding: 'utf8' }).trim();
            buildInfo.commitDate = new Date(commitDate).toISOString();
            console.log(`✅ Commit date: ${buildInfo.commitDate}`);
        } catch (error) {
            console.warn('⚠️ Could not get commit date:', error.message);
        }
        
        // Get commit message
        try {
            const commitMessage = execSync('git log -1 --format=%s', { encoding: 'utf8' }).trim();
            buildInfo.commitMessage = commitMessage;
            console.log(`✅ Commit message: ${commitMessage.substring(0, 50)}...`);
        } catch (error) {
            console.warn('⚠️ Could not get commit message:', error.message);
        }
        
        // Check if working directory is dirty
        try {
            const status = execSync('git status --porcelain', { encoding: 'utf8' }).trim();
            buildInfo.isDirty = status.length > 0;
            if (buildInfo.isDirty) {
                console.log('⚠️ Working directory has uncommitted changes');
            } else {
                console.log('✅ Working directory is clean');
            }
        } catch (error) {
            console.warn('⚠️ Could not check Git status:', error.message);
        }
        
        // Get remote URL
        try {
            const remoteUrl = execSync('git config --get remote.origin.url', { encoding: 'utf8' }).trim();
            buildInfo.repoUrl = remoteUrl;
            
            // Convert SSH URL to HTTPS for GitHub links
            if (remoteUrl.includes('github.com')) {
                let githubUrl = remoteUrl;
                if (githubUrl.startsWith('git@github.com:')) {
                    githubUrl = githubUrl.replace('git@github.com:', 'https://github.com/');
                }
                if (githubUrl.endsWith('.git')) {
                    githubUrl = githubUrl.slice(0, -4);
                }
                buildInfo.githubUrl = githubUrl;
                
                if (buildInfo.commitHash) {
                    buildInfo.commitUrl = `${githubUrl}/commit/${buildInfo.commitHash}`;
                }
            }
            console.log(`✅ Repository URL: ${buildInfo.repoUrl}`);
        } catch (error) {
            console.warn('⚠️ Could not get remote URL:', error.message);
        }
        
    } catch (error) {
        console.warn('⚠️ Git not available or not a Git repository:', error.message);
    }
    
    // Generate display text
    if (buildInfo.commitHashShort && buildInfo.branch) {
        if (buildInfo.isDirty) {
            buildInfo.displayText = `${buildInfo.branch}@${buildInfo.commitHashShort}*`;
        } else {
            buildInfo.displayText = `${buildInfo.branch}@${buildInfo.commitHashShort}`;
        }
    } else if (buildInfo.commitHashShort) {
        buildInfo.displayText = buildInfo.commitHashShort;
    } else {
        const buildDate = new Date(buildInfo.buildDate);
        buildInfo.displayText = `Build ${buildDate.toISOString().split('T')[0]}`;
    }
    
    // Add environment info
    buildInfo.environment = process.env.NODE_ENV || 'development';
    
    // Save build info to file
    const buildInfoPath = path.join(__dirname, '../build-info.json');
    fs.writeFileSync(buildInfoPath, JSON.stringify(buildInfo, null, 2));
    
    console.log('');
    console.log('🎉 Build information generated successfully!');
    console.log('==========================================');
    console.log(`📅 Build Date: ${buildInfo.buildDate}`);
    console.log(`🏷️ Display Text: ${buildInfo.displayText}`);
    console.log(`🌍 Environment: ${buildInfo.environment}`);
    console.log(`📁 Saved to: ${buildInfoPath}`);
    
    if (buildInfo.githubUrl) {
        console.log(`🔗 GitHub: ${buildInfo.githubUrl}`);
    }
    if (buildInfo.commitUrl) {
        console.log(`🔗 Commit: ${buildInfo.commitUrl}`);
    }
    
    return buildInfo;
}

// Run if called directly
if (require.main === module) {
    try {
        generateBuildInfo();
        process.exit(0);
    } catch (error) {
        console.error('🚨 Failed to generate build info:', error);
        process.exit(1);
    }
}

module.exports = { generateBuildInfo };
