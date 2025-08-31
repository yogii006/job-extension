# Job Mail Generator Chrome Extension

A Chrome extension that helps you generate professional job application emails using OpenAI's GPT model. Save your profile details once and let AI create personalized emails for different job opportunities.

## Features

- **Profile Management**: Save your personal details, experience, skills, and contact information
- **AI-Powered Email Generation**: Uses OpenAI GPT to create personalized job application emails
- **Easy to Use**: Simple interface to input recruiter email and job description
- **Professional Output**: Generates well-formatted, professional emails with proper subject lines
- **Secure**: Your OpenAI API key is stored securely in Chrome's sync storage

## Installation

1. **Download the Extension Files**
   - Download all the files in this folder to your computer
   - Make sure you have: `manifest.json`, `popup.html`, `popup.js`, `options.html`, `options.js`, `background.js`, `styles.css`, and `icon.png`

2. **Load Extension in Chrome**
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode" (toggle in the top right)
   - Click "Load unpacked"
   - Select the folder containing your extension files

3. **Get OpenAI API Key**
   - Go to [OpenAI Platform](https://platform.openai.com/api-keys)
   - Create an account or sign in
   - Generate a new API key
   - Copy the key (starts with `sk-`)

## Setup

1. **Configure Your Profile**
   - Click on the extension icon in your Chrome toolbar
   - Click "Settings" button
   - Fill in your personal information:
     - **Required**: Full Name, Email Address, OpenAI API Key
     - **Optional**: Phone, LinkedIn, Portfolio, Education, Experience, Skills
   - Click "Save Settings"

2. **Start Using**
   - Click the extension icon
   - Enter the recruiter's email address
   - Paste the job description
   - Optionally add the job title
   - Click "Generate Email"
   - The extension will create a professional email and open your default email client

## How It Works

1. **Profile Storage**: Your details are saved securely in Chrome's sync storage
2. **AI Processing**: When you generate an email, the extension sends your profile and job details to OpenAI's API
3. **Email Generation**: The AI creates a personalized, professional email based on the job requirements and your background
4. **Email Client Integration**: The generated email opens in your default email client (Gmail, Outlook, etc.) ready to send

## File Structure

- `manifest.json` - Extension configuration and permissions
- `popup.html` - Main extension popup interface
- `popup.js` - Popup functionality and user interaction
- `options.html` - Settings page for profile and API configuration
- `options.js` - Settings page functionality
- `background.js` - Background service worker for API calls
- `styles.css` - Styling for all extension pages
- `icon.png` - Extension icon

## Privacy & Security

- Your OpenAI API key is stored locally in Chrome's sync storage
- No data is sent to any server except OpenAI's API
- Your profile information is only used to generate emails
- The extension doesn't collect or store any personal data

## Troubleshooting

**"Invalid API Key" Error**
- Make sure your OpenAI API key is correct and starts with `sk-`
- Check that you have sufficient credits in your OpenAI account

**"API Rate Limit Exceeded" Error**
- Wait a few minutes and try again
- Consider upgrading your OpenAI plan if you're making many requests

**Extension Not Working**
- Make sure all files are in the same folder
- Check that the extension is enabled in Chrome
- Try reloading the extension in `chrome://extensions/`

## Tips for Better Results

1. **Complete Your Profile**: The more information you provide, the better the AI can personalize your emails
2. **Detailed Job Descriptions**: Include the full job description for better email customization
3. **Review Generated Emails**: Always review and edit the generated email before sending
4. **Keep API Key Secure**: Don't share your OpenAI API key with others

## Support

If you encounter any issues or have suggestions for improvements, please check the troubleshooting section above or create an issue in the project repository.

## License

This project is open source and available under the MIT License. 