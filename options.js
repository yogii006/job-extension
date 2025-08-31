document.addEventListener('DOMContentLoaded', function() {
    const saveBtn = document.getElementById('saveBtn');
    const saveStatus = document.getElementById('saveStatus');
    const resumeFileInput = document.getElementById('resumeFile');
    const resumeStatus = document.getElementById('resumeStatus');
    const resumeActions = document.getElementById('resumeActions');
    const downloadResumeBtn = document.getElementById('downloadResumeBtn');
    const removeResumeBtn = document.getElementById('removeResumeBtn');
    
    // Load existing data when page loads
    loadExistingData();
    
    saveBtn.addEventListener('click', function() {
        saveSettings();
    });
    
    // Handle resume file upload
    resumeFileInput.addEventListener('change', function(event) {
        const file = event.target.files[0];
        if (file) {
            handleResumeUpload(file);
        }
    });
    
    // Handle download resume
    downloadResumeBtn.addEventListener('click', function() {
        downloadResume();
    });
    
    // Handle remove resume
    removeResumeBtn.addEventListener('click', function() {
        removeResume();
    });
    
    // Add test API key button
    const testBtn = document.createElement('button');
    testBtn.textContent = 'Test API Key';
    testBtn.className = 'save-btn';
    testBtn.style.marginLeft = '10px';
    testBtn.style.background = 'linear-gradient(135deg, #007bff 0%, #0056b3 100%)';
    testBtn.addEventListener('click', testApiKey);
    
    saveBtn.parentNode.appendChild(testBtn);
    
    function loadExistingData() {
        // Load profile data from sync storage
        chrome.storage.sync.get([
            'name', 'email', 'phone', 'experience', 'skills', 'education', 
            'linkedin', 'github', 'portfolio', 'apiKey', 'resumeDriveLink'
        ], function(data) {
            if (data.name) document.getElementById('name').value = data.name;
            if (data.email) document.getElementById('email').value = data.email;
            if (data.phone) document.getElementById('phone').value = data.phone;
            if (data.experience) document.getElementById('experience').value = data.experience;
            if (data.skills) document.getElementById('skills').value = data.skills;
            if (data.education) document.getElementById('education').value = data.education;
            if (data.linkedin) document.getElementById('linkedin').value = data.linkedin;
            if (data.github) document.getElementById('github').value = data.github;
            if (data.portfolio) document.getElementById('portfolio').value = data.portfolio;
            if (data.apiKey) document.getElementById('apiKey').value = data.apiKey;
            if (data.resumeDriveLink) document.getElementById('resumeDriveLink').value = data.resumeDriveLink;
        });
        
        // Load resume data from local storage
        chrome.storage.local.get(['resumeFileData', 'resumeFileName'], function(data) {
            if (data.resumeFileData && data.resumeFileName) {
                showResumeStatus(`✅ Resume uploaded: ${data.resumeFileName}`, 'success');
                showResumeActions();
            }
        });
    }
    
    async function handleResumeUpload(file) {
        if (file.type !== 'application/pdf') {
            showResumeStatus('❌ Please select a PDF file', 'error');
            return;
        }
        
        if (file.size > 5 * 1024 * 1024) { // 5MB limit (reduced from 10MB)
            showResumeStatus('❌ File size too large. Please select a file under 5MB', 'error');
            return;
        }
        
        showResumeStatus('📄 Processing resume...', 'loading');
        
        try {
            // Store the file data for attachment
            const fileData = await fileToBase64(file);
            
            // Check if the base64 data is too large (Chrome storage limit is ~5MB)
            if (fileData.length > 4 * 1024 * 1024) { // 4MB base64 limit
                showResumeStatus('❌ File too large after conversion. Please try a smaller PDF file.', 'error');
                return;
            }
            
            // Store in local storage (larger limit than sync storage)
    chrome.storage.local.set({
                resumeFileData: fileData,
                resumeFileName: file.name,
                resumeFileSize: file.size
            }, function() {
                if (chrome.runtime.lastError) {
                    console.error('Storage error:', chrome.runtime.lastError);
                    showResumeStatus('❌ Error saving resume file. File might be too large.', 'error');
                } else {
                    showResumeStatus(`✅ Resume uploaded successfully: ${file.name}`, 'success');
                    showResumeActions();
                }
            });
            
        } catch (error) {
            console.error('Resume upload error:', error);
            showResumeStatus('❌ Error uploading resume. Please try again.', 'error');
        }
    }
    
    function downloadResume() {
        chrome.storage.local.get(['resumeFileData', 'resumeFileName'], function(data) {
            if (data.resumeFileData && data.resumeFileName) {
                try {
                    // Convert base64 to blob and download
                    const base64Data = data.resumeFileData.split(',')[1];
                    const byteCharacters = atob(base64Data);
                    const byteNumbers = new Array(byteCharacters.length);
                    for (let i = 0; i < byteCharacters.length; i++) {
                        byteNumbers[i] = byteCharacters.charCodeAt(i);
                    }
                    const byteArray = new Uint8Array(byteNumbers);
                    const blob = new Blob([byteArray], { type: 'application/pdf' });
                    
                    // Create download link
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = data.resumeFileName;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                    
                    showResumeStatus('📥 Resume downloaded successfully!', 'success');
                } catch (error) {
                    console.error('Download error:', error);
                    showResumeStatus('❌ Error downloading resume file.', 'error');
                }
            }
        });
    }
    
    function removeResume() {
        if (confirm('Are you sure you want to remove the uploaded resume?')) {
            chrome.storage.local.remove(['resumeFileData', 'resumeFileName', 'resumeFileSize'], function() {
                showResumeStatus('🗑️ Resume removed successfully', 'success');
                hideResumeActions();
                resumeFileInput.value = ''; // Clear the file input
            });
        }
    }
    
    function showResumeActions() {
        resumeActions.style.display = 'block';
    }
    
    function hideResumeActions() {
        resumeActions.style.display = 'none';
    }
    
    function fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }
    
    function saveSettings() {
        const name = document.getElementById('name').value.trim();
        const email = document.getElementById('email').value.trim();
        const phone = document.getElementById('phone').value.trim();
        const experience = document.getElementById('experience').value.trim();
        const skills = document.getElementById('skills').value.trim();
        const education = document.getElementById('education').value.trim();
        const linkedin = document.getElementById('linkedin').value.trim();
        const github = document.getElementById('github').value.trim();
        const portfolio = document.getElementById('portfolio').value.trim();
        const apiKey = document.getElementById('apiKey').value.trim();
        const resumeDriveLink = document.getElementById('resumeDriveLink').value.trim();
        
        // Validate required fields
        if (!name || !email || !apiKey) {
            showSaveStatus('Please fill in all required fields (Name, Email, and API Key).', 'error');
            return;
        }
        
        if (!isValidEmail(email)) {
            showSaveStatus('Please enter a valid email address.', 'error');
            return;
        }
        
        // Validate Google Drive link if provided
        if (resumeDriveLink && !isValidGoogleDriveLink(resumeDriveLink)) {
            showSaveStatus('Please enter a valid Google Drive sharing link.', 'error');
            return;
        }
        
        // Show loading state
        saveBtn.disabled = true;
        saveBtn.textContent = 'Saving...';
        
        const dataToSave = {
            name,
            email,
            phone,
            experience,
            skills,
            education,
            linkedin,
            github,
            portfolio,
            apiKey,
            resumeDriveLink
        };
        
        chrome.storage.sync.set(dataToSave, function() {
            if (chrome.runtime.lastError) {
                console.error('Error saving data:', chrome.runtime.lastError);
                showSaveStatus('Error saving settings. Please try again.', 'error');
            } else {
                showSaveStatus('Settings saved successfully!', 'success');
                
                // Reset button after 2 seconds
                setTimeout(() => {
                    saveBtn.disabled = false;
                    saveBtn.textContent = 'Save Settings';
                    showSaveStatus('', '');
                }, 2000);
            }
        });
    }
    
    async function testApiKey() {
        const apiKey = document.getElementById('apiKey').value.trim();
        
        if (!apiKey) {
            showSaveStatus('Please enter your API key first.', 'error');
            return;
        }
        
        testBtn.disabled = true;
        testBtn.textContent = 'Testing...';
        showSaveStatus('Testing API key...', 'loading');
        
        try {
            const response = await fetch('https://api.openai.com/v1/models', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.ok) {
                showSaveStatus('✅ API key is valid and working!', 'success');
            } else {
                const errorData = await response.json();
                showSaveStatus(`❌ API key error: ${errorData.error?.message || 'Unknown error'}`, 'error');
            }
        } catch (error) {
            console.error('API test error:', error);
            showSaveStatus('❌ Network error. Please check your internet connection.', 'error');
        }
        
        testBtn.disabled = false;
        testBtn.textContent = 'Test API Key';
    }
    
    function showSaveStatus(message, type) {
        saveStatus.textContent = message;
        saveStatus.className = `status ${type}`;
    }
    
    function showResumeStatus(message, type) {
        resumeStatus.textContent = message;
        resumeStatus.className = `resume-status ${type}`;
    }
    
    function isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }
    
    function isValidGoogleDriveLink(link) {
        // Basic validation for Google Drive sharing links
        const driveRegex = /^https:\/\/drive\.google\.com\/(file\/d\/|open\?id=)/;
        return driveRegex.test(link);
    }
    
    // Add keyboard shortcut (Ctrl+S) to save
    document.addEventListener('keydown', function(e) {
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            e.preventDefault();
            saveSettings();
        }
    });
});
