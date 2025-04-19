# Deployment Guide for Global Depot Locator

This document provides instructions for securely deploying the Global Depot Locator application to Netlify.

## Pre-Deployment Security Checklist

1. ✅ **No API Keys**: The application uses OpenStreetMap's Nominatim API which doesn't require API keys.
2. ✅ **Security Headers**: Added security headers in netlify.toml to protect against common web vulnerabilities.
3. ✅ **Content Security Policy**: Implemented CSP to prevent XSS attacks and restrict resource loading.
4. ✅ **Removed Server Logging**: Removed code that attempted to send logs to a server.
5. ✅ **Proper API Usage**: Added appropriate headers for Nominatim API requests to comply with their usage policy.
6. ✅ **Robots.txt**: Added to prevent indexing of development files.

## Deployment Steps

1. **Create a Netlify Account**:
   - Sign up at [netlify.com](https://www.netlify.com/) if you don't have an account.

2. **Deploy via Netlify UI**:
   - Go to [app.netlify.com](https://app.netlify.com/)
   - Drag and drop the entire project folder to the Netlify UI
   - Netlify will automatically detect the netlify.toml configuration

3. **Alternative: Deploy via Git**:
   - Push your code to a Git repository (GitHub, GitLab, or Bitbucket)
   - In Netlify, click "New site from Git"
   - Connect to your Git provider and select the repository
   - Netlify will automatically detect the netlify.toml configuration

4. **Configure Custom Domain** (Optional):
   - In your site settings on Netlify, go to "Domain settings"
   - Click "Add custom domain" and follow the instructions

## Post-Deployment Verification

After deployment, verify the following:

1. **Security Headers**: Use [securityheaders.com](https://securityheaders.com/) to check that your security headers are properly configured.

2. **Functionality**: Test all features of the application:
   - Map loading
   - Depot display
   - Search functionality
   - Adding/editing depots

3. **Mobile Responsiveness**: Test the application on various devices and screen sizes.

## Troubleshooting

- **Map Not Loading**: Check browser console for errors. Ensure the Content Security Policy allows loading from OpenStreetMap.
- **Search Not Working**: Verify that the Nominatim API is accessible and that the CSP allows connections to it.
- **Styling Issues**: Make sure all CSS files are being loaded correctly.

## Maintenance

- Regularly check for updates to the Leaflet library and other dependencies.
- Monitor Netlify logs for any errors or issues.
- Consider setting up Netlify Forms for user feedback.

## Data Privacy

- All depot data is stored in the user's browser using localStorage.
- No user data is sent to any server except for geocoding requests to Nominatim.
- Users should be informed that clearing browser data will reset the application.
