const OPENAI_API_KEY = 'your-api-key-here'; // Replace with your OpenAI API key

const dropArea = document.getElementById('drop-area');
const fileInput = document.getElementById('file-input');
const fileList = document.getElementById('fileNames');
const careplanOutput = document.getElementById('careplan-output');
let selectedFiles = [];

// Handle file selection and drag-drop functionality
dropArea.addEventListener('click', () => fileInput.click());

dropArea.addEventListener('dragover', (event) => {
    event.preventDefault();
    dropArea.classList.add('highlight');
});

dropArea.addEventListener('dragleave', () => dropArea.classList.remove('highlight'));

dropArea.addEventListener('drop', (event) => {
    event.preventDefault();
    dropArea.classList.remove('highlight');
    const files = event.dataTransfer.files;
    handleFiles(files);
});

fileInput.addEventListener('change', (event) => {
    const files = event.target.files;
    handleFiles(files);
});

function handleFiles(files) {
    selectedFiles = [...files];
    updateFileList();
}

function updateFileList() {
    fileList.innerHTML = '';
    selectedFiles.forEach((file) => {
        const li = document.createElement('li');
        li.textContent = file.name;
        fileList.appendChild(li);
    });
}

// Handle file processing and GPT API call
document.getElementById('submit-files').addEventListener('click', async () => {
    if (selectedFiles.length === 3) {
        careplanOutput.value = 'Loading... Please wait while the care plan is being generated.';

        try {
            const fileTexts = await extractTextFromFiles(selectedFiles);

            // Send text to OpenAI API
            const response = await generateCarePlan(fileTexts);
            
            // Display the entire raw API response
            careplanOutput.value = JSON.stringify(response, null, 2); // Display the raw JSON response
        } catch (error) {
            // Display error details in the UI and log them to the console
            careplanOutput.value = `An error occurred: ${error.message}`;
            console.error('Error details:', error); // Log the detailed error
        }
    } else {
        alert('Please upload all three documents.');
    }
});

// Extract text from uploaded files (PDF, DOCX, TXT)
async function extractTextFromFiles(files) {
    const fileTexts = [];
    
    for (const file of files) {
        if (file.type === 'application/pdf') {
            const text = await extractTextFromPDF(file);
            fileTexts.push(text);
        } else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
            const text = await extractTextFromDOCX(file);
            fileTexts.push(text);
        } else if (file.type === 'text/plain') {
            const text = await file.text();
            fileTexts.push(text);
        } else {
            alert('Unsupported file type: ' + file.type);
        }
    }

    return fileTexts;
}

// Extract text from PDF files using pdf-lib
async function extractTextFromPDF(file) {
    const arrayBuffer = await file.arrayBuffer();
    const pdfDoc = await PDFLib.PDFDocument.load(arrayBuffer);
    const pages = pdfDoc.getPages();
    let text = '';

    for (const page of pages) {
        text += page.getTextContent().text;
    }

    return text;
}

// Extract text from DOCX files using mammoth.js
async function extractTextFromDOCX(file) {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer: arrayBuffer });
    return result.value;
}

// Send data to OpenAI and generate care plan
async function generateCarePlan(fileTexts) {
    const prompt = `
        Care plan document: ${fileTexts[0]}
        Doctor/Psychiatrist notes: ${fileTexts[1]}
        Client's personal goals: ${fileTexts[2]}
        Please generate a sample care plan based on the above documents.
    `;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${OPENAI_API_KEY}`
        },
        body: JSON.stringify({
            model: 'gpt-3.5-turbo', // or 'gpt-4' depending on your plan
            messages: [
                { role: 'system', content: 'You are a helpful assistant.' },
                { role: 'user', content: prompt }
            ],
            max_tokens: 1000,
            temperature: 0.7
        })
    });

    if (!response.ok) {
        // Throw an error with detailed information
        const errorData = await response.json();
        throw new Error(`API Error: ${response.statusText}. Details: ${JSON.stringify(errorData)}`);
    }

    // Parse the response
    const data = await response.json();
    
    // Extract and return the care plan text
    const carePlanText = data.choices[0].message.content; // Extract the actual content
    return carePlanText;
}

// Handle file processing and GPT API call
document.getElementById('submit-files').addEventListener('click', async () => {
    if (selectedFiles.length === 3) {
        careplanOutput.value = 'Loading... Please wait while the care plan is being generated.';

        try {
            const fileTexts = await extractTextFromFiles(selectedFiles);

            // Send text to OpenAI API
            const carePlanText = await generateCarePlan(fileTexts);
            
            // Display only the extracted care plan text
            careplanOutput.value = carePlanText; // Display just the care plan
        } catch (error) {
            // Display error details in the UI and log them to the console
            careplanOutput.value = `An error occurred: ${error.message}`;
            console.error('Error details:', error); // Log the detailed error
        }
    } else {
        alert('Please upload all three documents.');
    }
});


