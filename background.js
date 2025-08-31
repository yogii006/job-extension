async function generateWithLLM(apiKey, prompt) {
    const url = "https://api.openai.com/v1/chat/completions";

    console.log('Making API call with key:', apiKey ? `${apiKey.substring(0, 10)}...` : 'No key provided');

    const payload = {
        model: "gpt-3.5-turbo",
        messages: [
            { 
                role: "system", 
                content: `You are a professional job application assistant specializing in creating compelling, personalized job application emails. 

Your emails should be:
- Professional, confident, and enthusiastic
- Specific to the company and role requirements
- Focused on value and achievements, not just skills
- Concise (150-200 words) but impactful
- Well-structured with clear opening, body, and closing
- Personalized to show genuine interest in the company

Key principles:
1. Start with a strong hook that shows understanding of the company/role
2. Highlight specific achievements that relate to the job requirements
3. Show how your skills solve their problems or contribute to their goals
4. Use confident but humble tone
5. Include specific examples and metrics when possible
6. End with a clear call to action
7. Generate ONLY the email body content, NOT the subject line
8. Do not include "Subject:" or any subject line information in your response`
            },
            { role: "user", content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 500
    };

    try {
        console.log('Sending request to OpenAI...');
        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
        });

        console.log('Response status:', response.status);

        if (!response.ok) {
            const errorData = await response.json();
            console.error('OpenAI API Error Response:', errorData);
            throw new Error(errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        console.log('OpenAI API Success Response received');
        
        if (data.error) {
            throw new Error(data.error.message);
        }

        if (!data.choices || !data.choices[0] || !data.choices[0].message) {
            throw new Error('Invalid response from OpenAI API');
        }

        return data.choices[0].message.content.trim();
    } catch (error) {
        console.error('OpenAI API Error:', error);
        throw error;
    }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "generateEmail") {
        const { recruiterEmail, jobDescription, jobTitle, userDetails } = message;

        console.log('Received generateEmail request:', {
            recruiterEmail,
            jobTitle,
            userDetails: {
                name: userDetails.name,
                email: userDetails.email,
                apiKey: userDetails.apiKey ? `${userDetails.apiKey.substring(0, 10)}...` : 'No key',
                hasResume: !!userDetails.resumeFileData,
                resumeFileName: userDetails.resumeFileName,
                hasDriveLink: !!userDetails.resumeDriveLink
            }
        });

        // Extract email from job description if not provided
        let finalRecruiterEmail = recruiterEmail;
        if (!finalRecruiterEmail || finalRecruiterEmail.trim() === '') {
            const emailMatch = jobDescription.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g);
            if (emailMatch && emailMatch.length > 0) {
                finalRecruiterEmail = emailMatch[0];
                console.log('Extracted email from job description:', finalRecruiterEmail);
            } else {
                console.log('No email found in job description, using provided email:', recruiterEmail);
            }
        }

        // Create a comprehensive prompt
        let prompt = `
Generate a professional job application email for the following position:

JOB TITLE: ${jobTitle || 'Software Position'}
RECRUITER EMAIL: ${finalRecruiterEmail}

JOB DESCRIPTION:
${jobDescription}

CANDIDATE INFORMATION:
- Name: ${userDetails.name}
- Email: ${userDetails.email}
- Phone: ${userDetails.phone || 'Not provided'}
- Experience: ${userDetails.experience || 'Not specified'}
- Skills: ${userDetails.skills || 'Not specified'}
- Education: ${userDetails.education || 'Not specified'}
- LinkedIn: ${userDetails.linkedin || 'Not provided'}
- Portfolio: ${userDetails.portfolio || 'Not provided'}
`;

        // Add resume information if available
        if (userDetails.resumeDriveLink) {
            prompt += `
RESUME: The candidate has provided a Google Drive link to their resume: ${userDetails.resumeDriveLink}
Please naturally mention this resume link in the email, such as "You can find my detailed resume at the link below" or "I've attached my resume for your review".
The resume link will be added as a clickable link after the email content, so you don't need to include the actual URL in your response.
`;
        } else if (userDetails.resumeFileData && userDetails.resumeFileName) {
            prompt += `
RESUME: The candidate has uploaded a resume file named "${userDetails.resumeFileName}" which will be attached to this email.
Please mention that the resume is attached to the email.
`;
        }

        prompt += `
Please create a professional email that:
1. Addresses the recruiter professionally - if a recruiter name is mentioned in the job description, use "Dear [Name]". If no name is found, use "Dear Hiring Manager"
2. Opens with a strong, specific hook that shows enthusiasm for the company/role
3. Demonstrates understanding of the company and role requirements
4. Highlights 2-3 specific achievements or experiences that directly relate to the job requirements
5. Shows how your skills solve their specific problems or contribute to their goals
6. Includes a clear call to action (requesting an interview or next steps)
7. Naturally mentions the resume (either as a link or attachment)
8. Ends with a professional signature including name, email, and phone
9. Keep the tone confident but humble, professional but enthusiastic
10. Use specific examples and metrics when possible
11. Show genuine interest in the company's mission/technology

Make the email personalized and specific to this job opportunity. Keep it concise (150-200 words) but compelling. Focus on value you can bring to the company, not just listing your skills.
`;

        generateWithLLM(userDetails.apiKey, prompt)
            .then(emailText => {
                // Generate a professional subject line using OpenAI
                const subjectPrompt = `
Generate a professional email subject line for a job application.

JOB TITLE: ${jobTitle || 'Software Position'}
CANDIDATE NAME: ${userDetails.name}
JOB DESCRIPTION: ${jobDescription.substring(0, 200)}...

Requirements for the subject line:
1. Use the format: "Application for [Position Title] at [Company Name]"
2. Extract the company name from the job description if mentioned
3. Use the exact job title from the job description
4. Keep it professional and concise (under 60 characters)
5. If company name is not found, use "Application for [Position Title]"
6. Make it specific to the role and company
7. Avoid generic phrases or personal information

Examples of good subject lines:
- "Application for Software Engineer at Google"
- "Application for Data Scientist at Microsoft"
- "Application for Frontend Developer at Startup Inc"
- "Application for AI/ML Engineer at TechCorp"

Generate ONLY the subject line text, nothing else.
`;

                return generateWithLLM(userDetails.apiKey, subjectPrompt)
                    .then(subjectLine => {
                        console.log('Email and subject generated successfully');
                        
                        // Create response with attachment information
                        const response = {
                            success: true,
                            subject: subjectLine,
                            body: emailText,
                            hasResume: !!userDetails.resumeFileData,
                            resumeFileName: userDetails.resumeFileName,
                            hasDriveLink: !!userDetails.resumeDriveLink
                        };
                        
                        sendResponse(response);
                    });
            })
            .catch(err => {
                console.error("Email generation error:", err);
                
                let errorMessage = "Failed to generate email.";
                if (err.message.includes("401")) {
                    errorMessage = "Invalid API key. Please check your OpenAI API key in settings.";
                } else if (err.message.includes("429")) {
                    errorMessage = "API rate limit exceeded. Please try again later.";
                } else if (err.message.includes("500")) {
                    errorMessage = "OpenAI service error. Please try again later.";
                } else if (err.message.includes("network")) {
                    errorMessage = "Network error. Please check your internet connection.";
                }
                
                sendResponse({ 
                    success: false, 
                    error: errorMessage 
                });
            });

        return true; // Keeps the message channel open for async response
    }
});

// Handle extension installation
chrome.runtime.onInstalled.addListener((details) => {
    if (details.reason === 'install') {
        // Open options page on first install
        chrome.runtime.openOptionsPage();
    }
});
