document.addEventListener('DOMContentLoaded', function () {
    const generateBtn = document.getElementById('generateBtn');
    const settingsBtn = document.getElementById('settingsBtn');
    const clearFormBtn = document.getElementById('clearFormBtn');
    const recruiterEmailInput = document.getElementById('recruiterEmail');
    const jobDescInput = document.getElementById('jobDesc');
    const jobTitleInput = document.getElementById('jobTitle');
    const statusDiv = document.getElementById('status');

    // Restore form state when popup opens
    restoreFormState();

    // Add event listeners to save form state as user types
    recruiterEmailInput.addEventListener('input', saveFormState);
    jobDescInput.addEventListener('input', saveFormState);
    jobTitleInput.addEventListener('input', saveFormState);

    // Load saved data
    loadSavedData();

    generateBtn.addEventListener('click', async () => {
        const recruiterEmail = recruiterEmailInput.value.trim();
        const jobDescription = jobDescInput.value.trim();
        const jobTitle = jobTitleInput.value.trim();

        // Validate inputs
        if (!jobDescription.trim()) {
            showStatus('❌ Please enter a job description', 'error');
            return;
        }

        // Extract email from job description if recruiter email is empty
        let finalRecruiterEmail = recruiterEmail.trim();
        if (!finalRecruiterEmail) {
            const emailMatch = jobDescription.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g);
            if (emailMatch && emailMatch.length > 0) {
                finalRecruiterEmail = emailMatch[0];
                console.log('Extracted email from job description:', finalRecruiterEmail);
                showStatus('Email extracted from job description: ' + finalRecruiterEmail, 'info');
            } else {
                showStatus('❌ No email found in job description. Please enter recruiter email manually.', 'error');
                return;
            }
        }

        // Validate email format
        const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        if (!emailRegex.test(finalRecruiterEmail)) {
            showStatus('❌ Please enter a valid email address', 'error');
            return;
        }

        if (!finalRecruiterEmail) {
            showStatus('Please fill in recruiter email and job description.', 'error');
            return;
        }

        // Show loading state
        generateBtn.disabled = true;
        generateBtn.innerHTML = '<span class="loading-spinner"></span>Generating...';
        showStatus('Generating your email...', 'loading');

        try {
            // Fetch stored details from both sync and local storage
            const [profileData, resumeData] = await Promise.all([
                getProfileData(),
                getResumeData()
            ]);
            
            const data = { ...profileData, ...resumeData };
            
            // Debug: Log the stored data (without showing the full API key)
            console.log('Stored data:', {
                name: data.name,
                email: data.email,
                apiKey: data.apiKey ? `${data.apiKey.substring(0, 10)}...` : 'Not found',
                hasResume: !!data.resumeFileData,
                resumeFileName: data.resumeFileName,
                hasDriveLink: !!data.resumeDriveLink
            });
            
            if (!data.apiKey) {
                showStatus('Please set your OpenAI API Key in settings.', 'error');
                generateBtn.disabled = false;
                generateBtn.textContent = 'Generate Email';
                return;
            }

            if (!data.name || !data.email) {
                showStatus('Please complete your profile in settings.', 'error');
                generateBtn.disabled = false;
                generateBtn.textContent = 'Generate Email';
                return;
            }

            // Send message to background script
            chrome.runtime.sendMessage({
                action: "generateEmail",
                recruiterEmail: finalRecruiterEmail,
                jobDescription: jobDescription,
                jobTitle: jobTitle,
                userDetails: data
            }, response => {
                if (chrome.runtime.lastError) {
                    console.error(chrome.runtime.lastError.message);
                    showStatus('❌ Error communicating with extension', 'error');
                    return;
                }

                if (response.success) {
                    showStatus('✅ Email generated successfully!', 'success');
                    
                    // Create email with resume link and attachment
                    createEmailWithResumeLinkAndAttachment(response, data, finalRecruiterEmail);
                    
                    // Clear form after successful generation
                    recruiterEmailInput.value = '';
                    jobDescInput.value = '';
                    jobTitleInput.value = '';
                    
                    // Clear saved form state
                    clearFormState();
                } else {
                    showStatus('❌ ' + response.error, 'error');
                }
            });

        } catch (error) {
            console.error('Error:', error);
            showStatus('An error occurred. Please try again.', 'error');
            generateBtn.disabled = false;
            generateBtn.textContent = 'Generate Email';
        }
    });

    settingsBtn.addEventListener('click', () => {
        chrome.runtime.openOptionsPage();
    });

    clearFormBtn.addEventListener('click', () => {
        // Clear form fields
        recruiterEmailInput.value = '';
        jobDescInput.value = '';
        jobTitleInput.value = '';
        
        // Clear saved form state
        clearFormState();
        
        // Show confirmation
        showStatus('✅ Form cleared successfully!', 'success');
        
        // Clear status after 2 seconds
        setTimeout(() => {
            showStatus('', '');
        }, 2000);
    });

    function createEmailWithResumeLinkAndAttachment(response, userData, recruiterEmail) {
        if (userData.resumeDriveLink) {
            // Use Google Drive link with PDF download and attachment
            createEmailWithDriveLinkAndAttachment(response, userData, recruiterEmail);
        } else if (response.hasResume && userData.resumeFileData) {
            // Fallback to file download method
            createGmailWithResume(response, userData, recruiterEmail);
        } else {
            // Simple mailto for emails without resume
            const mailtoUrl = `mailto:${recruiterEmail}?subject=${encodeURIComponent(response.subject)}&body=${encodeURIComponent(response.body)}`;
            window.open(mailtoUrl);
        }
    }
    
    async function createEmailWithDriveLinkAndAttachment(response, userData, recruiterEmail) {
        try {
            // First, try to download the PDF from Google Drive
            showStatus('📥 Downloading resume from Google Drive...', 'loading');
            
            const pdfBlob = await downloadPdfFromDrive(userData.resumeDriveLink);
            
            if (pdfBlob) {
                // Download the PDF for attachment
                downloadPdfForAttachment(pdfBlob, userData.resumeFileName || 'resume.pdf');
                
                // Create email content with clickable links
                const emailContentWithLinks = createEmailContentWithLinks(response.body, userData);
                
                // Go directly to Gmail compose with proper subject and content
                const gmailUrl = createGmailComposeUrl(recruiterEmail, response.subject, emailContentWithLinks);
                window.open(gmailUrl, '_blank');
                
                // Also create a copy-friendly version with clickable links
                createCopyFriendlyVersion(response, userData, recruiterEmail);
                
                showStatus('📧 Email opened in Gmail with attachment!', 'success');
            } else {
                // Fallback to just the link if download fails
                const emailContentWithLinks = createEmailContentWithLinks(response.body, userData);
                const gmailUrl = createGmailComposeUrl(recruiterEmail, response.subject, emailContentWithLinks);
                window.open(gmailUrl, '_blank');
                
                // Also create a copy-friendly version with clickable links
                createCopyFriendlyVersion(response, userData, recruiterEmail);
                
                showStatus('📧 Email opened in Gmail!', 'success');
            }
        } catch (error) {
            console.error('Error creating email with Drive link:', error);
            // Fallback to simple link
            const emailContentWithLinks = createEmailContentWithLinks(response.body, userData);
            const gmailUrl = createGmailComposeUrl(recruiterEmail, response.subject, emailContentWithLinks);
            window.open(gmailUrl, '_blank');
            
            // Also create a copy-friendly version with clickable links
            createCopyFriendlyVersion(response, userData, recruiterEmail);
            
            showStatus('📧 Email opened in Gmail!', 'success');
        }
    }
    
    function createCopyFriendlyVersion(response, userData, recruiterEmail) {
        const emailContentPlain = createEmailContentWithLinks(response.body, userData);
        const emailContentHtml = createEmailContentWithHtmlLinks(response.body, userData);
        const directLink = convertToDirectLink(userData.resumeDriveLink);
        
        const copyFriendlyHtml = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Email Content with Clickable Links</title>
    <style>
        body { font-family: Arial, sans-serif; padding: 20px; max-width: 800px; margin: 0 auto; }
        .email-content { background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .email-content a { color: #007bff; text-decoration: underline; }
        .copy-btn { background: #007bff; color: white; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer; margin: 5px; }
        .copy-btn:hover { background: #0056b3; }
        .info { background: #e3f2fd; padding: 15px; border-radius: 5px; margin: 15px 0; }
        .tabs { display: flex; margin-bottom: 20px; }
        .tab { padding: 10px 20px; background: #f1f1f1; border: none; cursor: pointer; }
        .tab.active { background: #007bff; color: white; }
        .tab-content { display: none; }
        .tab-content.active { display: block; }
    </style>
</head>
<body>
    <h2>📧 Email Content with Clickable Links</h2>
    
    <div class="info">
        <strong>To:</strong> ${recruiterEmail}<br>
        <strong>Subject:</strong> ${response.subject}
    </div>
    
    <div class="tabs">
        <button class="tab active" onclick="showTab('plain')">📝 Plain Text</button>
        <button class="tab" onclick="showTab('rich')">🔗 Rich Text</button>
    </div>
    
    <div id="plain-tab" class="tab-content active">
        <div class="email-content">
            ${emailContentPlain.replace(/\n/g, '<br>')}
        </div>
        <button class="copy-btn" onclick="copyPlainText()">📋 Copy Plain Text</button>
    </div>
    
    <div id="rich-tab" class="tab-content">
        <div class="email-content">
            ${emailContentHtml.replace(/\n/g, '<br>')}
        </div>
        <button class="copy-btn" onclick="copyRichText()">🔗 Copy Rich Text</button>
    </div>
    
    <div>
        <button class="copy-btn" onclick="copyResumeLink()">📄 Copy Resume Link</button>
        <button class="copy-btn" onclick="window.close()">❌ Close</button>
    </div>
    
    <div class="info">
        <strong>Instructions:</strong><br>
        • <strong>Plain Text:</strong> Use this for Gmail compose - links will be auto-detected<br>
        • <strong>Rich Text:</strong> Use this for email clients that support HTML<br>
        • <strong>Resume Link:</strong> Copy separately for manual attachment<br>
        • Don't forget to attach the downloaded resume file!
    </div>
    
    <script>
        function showTab(tabName) {
            // Hide all tabs
            document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
            document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
            
            // Show selected tab
            document.getElementById(tabName + '-tab').classList.add('active');
            event.target.classList.add('active');
        }
        
        function copyPlainText() {
            const content = \`${emailContentPlain.replace(/`/g, '\\`')}\`;
            copyToClipboard(content, 'Plain text copied to clipboard!');
        }
        
        function copyRichText() {
            const content = \`${emailContentHtml.replace(/`/g, '\\`')}\`;
            copyToClipboard(content, 'Rich text copied to clipboard!');
        }
        
        function copyResumeLink() {
            copyToClipboard('${directLink}', 'Resume link copied to clipboard!');
        }
        
        function copyToClipboard(text, message) {
            navigator.clipboard.writeText(text).then(() => {
                alert(message);
            }).catch(() => {
                // Fallback
                const textArea = document.createElement('textarea');
                textArea.value = text;
                document.body.appendChild(textArea);
                textArea.select();
                document.execCommand('copy');
                document.body.removeChild(textArea);
                alert(message);
            });
        }
    </script>
</body>
</html>
        `;
        
        // Open the copy-friendly version in a new tab
        chrome.tabs.create({
            url: 'data:text/html;charset=utf-8,' + encodeURIComponent(copyFriendlyHtml)
        });
    }
    
    function createGmailComposeUrl(recruiterEmail, subject, emailContent) {
        const encodedSubject = encodeURIComponent(subject);
        const encodedBody = encodeURIComponent(emailContent);
        
        // Create Gmail compose URL
        const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${recruiterEmail}&su=${encodedSubject}&body=${encodedBody}`;
        
        return gmailUrl;
    }
    
    function createEmailContentWithLinks(emailBody, userData) {
        let content = emailBody;
        
        // Add LinkedIn link if available
        if (userData.linkedin) {
            content += '\n\nLinkedIn: ' + userData.linkedin;
        }
        
        // Add GitHub link if available
        if (userData.github) {
            content += '\nGitHub: ' + userData.github;
        }
        
        // Add Portfolio link if available
        if (userData.portfolio) {
            content += '\nPortfolio: ' + userData.portfolio;
        }
        
        // Add Resume link
        if (userData.resumeDriveLink) {
            const directLink = convertToDirectLink(userData.resumeDriveLink);
            content += '\nResume: ' + directLink;
        }
        
        return content;
    }
    
    function createEmailContentWithHtmlLinks(emailBody, userData) {
        let content = emailBody;
        
        // Add LinkedIn link if available
        if (userData.linkedin) {
            content += '\n\nLinkedIn: <a href="' + userData.linkedin + '" target="_blank">' + userData.linkedin + '</a>';
        }
        
        // Add GitHub link if available
        if (userData.github) {
            content += '\nGitHub: <a href="' + userData.github + '" target="_blank">' + userData.github + '</a>';
        }
        
        // Add Portfolio link if available
        if (userData.portfolio) {
            content += '\nPortfolio: <a href="' + userData.portfolio + '" target="_blank">' + userData.portfolio + '</a>';
        }
        
        // Add Resume link
        if (userData.resumeDriveLink) {
            const directLink = convertToDirectLink(userData.resumeDriveLink);
            content += '\nResume: <a href="' + directLink + '" target="_blank">' + directLink + '</a>';
        }
        
        return content;
    }
    
    function createClickableDriveLink(driveLink) {
        // Convert Google Drive link to direct download link and make it clickable
        const directLink = convertToDirectLink(driveLink);
        return `📎 My Resume: ${directLink}`;
    }
    
    function convertToDirectLink(driveLink) {
        // Convert Google Drive sharing link to proper format for clickability
        if (driveLink.includes('/file/d/')) {
            const fileId = driveLink.match(/\/file\/d\/([^\/]+)/)?.[1];
            if (fileId) {
                // Use the proper Google Drive format for better clickability
                return `https://drive.google.com/file/d/${fileId}/view?usp=drive_link`;
            }
        } else if (driveLink.includes('id=')) {
            const fileId = driveLink.match(/id=([^&]+)/)?.[1];
            if (fileId) {
                return `https://drive.google.com/file/d/${fileId}/view?usp=drive_link`;
            }
        }
        return driveLink; // Return original if conversion fails
    }
    
    async function downloadPdfFromDrive(driveLink) {
        try {
            // Extract file ID from the Drive link
            let fileId;
            if (driveLink.includes('/file/d/')) {
                fileId = driveLink.match(/\/file\/d\/([^\/]+)/)?.[1];
            } else if (driveLink.includes('id=')) {
                fileId = driveLink.match(/id=([^&]+)/)?.[1];
            }
            
            if (fileId) {
                // Use the export download link for getting the file
                const downloadLink = `https://drive.google.com/uc?export=download&id=${fileId}`;
                const response = await fetch(downloadLink);
                
                if (response.ok) {
                    const blob = await response.blob();
                    return blob;
                } else {
                    console.error('Failed to download PDF from Drive');
                    return null;
                }
            } else {
                console.error('Could not extract file ID from Drive link');
                return null;
            }
        } catch (error) {
            console.error('Error downloading PDF from Drive:', error);
            return null;
        }
    }
    
    function downloadPdfForAttachment(blob, fileName) {
        try {
            // Create download link
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `RESUME_${fileName}`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            console.log('PDF downloaded for attachment:', fileName);
        } catch (error) {
            console.error('Error downloading PDF for attachment:', error);
        }
    }
    
    function showAttachmentInstructions(fileName) {
        const instructions = `
📧 Email Generated Successfully!

Your email has been opened in Gmail compose with:
✅ Clickable resume link
✅ Resume PDF downloaded for attachment

📎 To attach the resume:
1. Look for "RESUME_${fileName}" in your Downloads folder
2. In Gmail compose, click the 📎 attachment button
3. Select the downloaded resume file
4. Review and send your email

💡 The resume link is also clickable in the email body for easy access.
        `;
        
        setTimeout(() => {
            alert(instructions);
        }, 1000);
    }
    
    function createGmailWithResume(response, userData, recruiterEmail) {
        // First, download the resume to a known location
        downloadResumeToDesktop(userData.resumeFileName, userData.resumeFileData);
        
        // Create Gmail compose URL with the email content
        const emailBody = response.body + '\n\n---\nNote: My resume is attached to this email.';
        const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${recruiterEmail}&su=${encodeURIComponent(response.subject)}&body=${encodeURIComponent(emailBody)}`;
        
        // Open Gmail compose
        window.open(gmailUrl, '_blank');
        
        // Show instructions for easy attachment
        showGmailAttachmentInstructions(userData.resumeFileName);
        
        // Also try to create a file object for potential drag-and-drop
        createResumeFileForDragDrop(userData.resumeFileName, userData.resumeFileData);
    }
    
    function downloadResumeToDesktop(fileName, fileData) {
        try {
            // Convert base64 to blob and download to desktop
            const base64Data = fileData.split(',')[1];
            const byteCharacters = atob(base64Data);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            const blob = new Blob([byteArray], { type: 'application/pdf' });
            
            // Create download link with a specific filename for easy finding
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `RESUME_${fileName}`; // Prefix for easy identification
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            showStatus('📥 Resume downloaded! Gmail compose opened.', 'success');
        } catch (error) {
            console.error('Download error:', error);
            showStatus('❌ Error downloading resume file.', 'error');
        }
    }
    
    function createResumeFileForDragDrop(fileName, fileData) {
        try {
            // Create a file object that could potentially be used for drag-and-drop
            const base64Data = fileData.split(',')[1];
            const byteCharacters = atob(base64Data);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            const blob = new Blob([byteArray], { type: 'application/pdf' });
            
            // Store the file object in a global variable for potential use
            window.resumeFileForAttachment = new File([blob], fileName, { type: 'application/pdf' });
            
            console.log('Resume file object created for potential drag-and-drop:', window.resumeFileForAttachment);
        } catch (error) {
            console.error('Error creating file object:', error);
        }
    }
    
    function showGmailAttachmentInstructions(fileName) {
        const instructions = `
📧 Gmail Compose Opened!

Your email content has been loaded in Gmail compose.

📎 To attach your resume:
1. Look for the file "RESUME_${fileName}" in your Downloads folder
2. In Gmail compose, click the 📎 attachment button (paperclip icon)
3. Select the downloaded resume file
4. Review and send your email

💡 Tip: The resume file is prefixed with "RESUME_" for easy identification in your Downloads folder.

🔄 Alternative: You can also drag and drop the file directly into Gmail compose.
        `;
        
        // Show instructions after a short delay
        setTimeout(() => {
            alert(instructions);
        }, 1000);
    }

    function showStatus(message, type) {
        statusDiv.textContent = message;
        statusDiv.className = `status ${type}`;
    }

    function isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    function getProfileData() {
        return new Promise((resolve) => {
            chrome.storage.sync.get([
                'name', 'email', 'phone', 'experience', 'skills', 'education', 
                'linkedin', 'github', 'portfolio', 'apiKey', 'resumeDriveLink'
            ], (data) => {
                console.log('Profile data:', data);
                resolve(data);
            });
        });
    }

    function getResumeData() {
        return new Promise((resolve) => {
            chrome.storage.local.get(['resumeFileData', 'resumeFileName'], (data) => {
                console.log('Resume data:', data);
                resolve(data);
        });
    });
    }

    async function loadSavedData() {
        const data = await getProfileData();
        
        // Pre-fill job title if available from previous use
        if (data.lastJobTitle) {
            jobTitleInput.value = data.lastJobTitle;
        }
    }
});

// Save form state to storage
function saveFormState() {
    const formData = {
        recruiterEmail: document.getElementById('recruiterEmail').value,
        jobDescription: document.getElementById('jobDesc').value,
        jobTitle: document.getElementById('jobTitle').value,
        timestamp: Date.now()
    };
    
    chrome.storage.local.set({ 'formState': formData }, () => {
        console.log('Form state saved');
    });
}

// Restore form state from storage
function restoreFormState() {
    chrome.storage.local.get(['formState'], (result) => {
        if (result.formState) {
            const formData = result.formState;
            
            // Only restore if data is less than 24 hours old
            const isRecent = (Date.now() - formData.timestamp) < (24 * 60 * 60 * 1000);
            
            if (isRecent) {
                document.getElementById('recruiterEmail').value = formData.recruiterEmail || '';
                document.getElementById('jobDesc').value = formData.jobDescription || '';
                document.getElementById('jobTitle').value = formData.jobTitle || '';
                console.log('Form state restored');
            } else {
                // Clear old data
                chrome.storage.local.remove(['formState']);
            }
        }
    });
}

// Clear form state from storage
function clearFormState() {
    chrome.storage.local.remove(['formState'], () => {
        console.log('Form state cleared');
    });
}
