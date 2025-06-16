const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const cors = require("cors");
const mammoth = require("mammoth");
const axios = require("axios");
const { PDFExtract } = require("pdf.js-extract");
const pdfExtractJs = new PDFExtract();
const ffmpeg = require("fluent-ffmpeg");
const { exec } = require("child_process");
const sharp = require("sharp");
const { Document, Packer, Paragraph, TextRun, HeadingLevel } = require("docx");
const officeParser = require("officeparser");

const app = express();
const port = 3002;

// Configure Axios to always use IPv4 for Ollama
const ollamaAPI = axios.create({
  baseURL: "http://127.0.0.1:11434/api",
});

// Middleware
app.use(cors());

// Increase JSON payload size limit
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Set up storage for uploaded files
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, "uploads");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir);
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

const upload = multer({ 
  storage: storage,
  fileFilter: (req, file, cb) => {
    // Accept all file types
    cb(null, true);
  }
});

// Create downloads directory if it doesn't exist
const downloadsDir = path.join(__dirname, "downloads");
if (!fs.existsSync(downloadsDir)) {
  fs.mkdirSync(downloadsDir);
}

// Create models directory if it doesn't exist
const modelsDir = path.join(__dirname, "models");
if (!fs.existsSync(modelsDir)) {
  fs.mkdirSync(modelsDir);
}

// Initialize document store
app.locals.documents = {};

// Helper function to detect file type
function detectFileType(file) {
  const extension = file.originalname.split('.').pop().toLowerCase();
  const mimeType = file.mimetype;
  
  // Document types
  if (['pdf'].includes(extension)) return 'pdf';
  if (['doc', 'docx'].includes(extension)) return 'doc';
  if (['txt'].includes(extension)) return 'txt';
  if (['md', 'markdown'].includes(extension)) return 'markdown';
  if (['rtf'].includes(extension)) return 'rtf';
  if (['odt'].includes(extension)) return 'odt';
  if (['ppt', 'pptx'].includes(extension)) return 'presentation';
  
  // Spreadsheet types
  if (['xls', 'xlsx'].includes(extension)) return 'spreadsheet';
  if (['csv'].includes(extension)) return 'csv';
  if (['ods'].includes(extension)) return 'spreadsheet';
  
  // Presentation types
  if (['odp'].includes(extension)) return 'presentation';
  
  // Image types
  if (['jpg', 'jpeg'].includes(extension)) return 'image/jpeg';
  if (['png'].includes(extension)) return 'image/png';
  if (['gif'].includes(extension)) return 'image/gif';
  if (['bmp'].includes(extension)) return 'image/bmp';
  if (['webp'].includes(extension)) return 'image/webp';
  if (['svg'].includes(extension)) return 'image/svg+xml';
  if (['tiff', 'tif'].includes(extension)) return 'image/tiff';
  
  // Video types
  if (['mp4'].includes(extension)) return 'video/mp4';
  if (['mov'].includes(extension)) return 'video/quicktime';
  if (['avi'].includes(extension)) return 'video/avi';
  if (['mkv'].includes(extension)) return 'video/mkv';
  if (['webm'].includes(extension)) return 'video/webm';
  if (['wmv'].includes(extension)) return 'video/wmv';
  if (['flv'].includes(extension)) return 'video/flv';
  
  // Audio types
  if (['mp3'].includes(extension)) return 'audio/mpeg';
  if (['wav'].includes(extension)) return 'audio/wav';
  if (['flac'].includes(extension)) return 'audio/flac';
  if (['aac'].includes(extension)) return 'audio/aac';
  if (['ogg'].includes(extension)) return 'audio/ogg';
  if (['wma'].includes(extension)) return 'audio/wma';
  
  // Archive types
  if (['zip'].includes(extension)) return 'archive/zip';
  if (['rar'].includes(extension)) return 'archive/rar';
  if (['7z'].includes(extension)) return 'archive/7z';
  if (['tar', 'gz', 'tgz'].includes(extension)) return 'archive/tar';
  
  // Code types
  if (['js', 'jsx'].includes(extension)) return 'code/javascript';
  if (['ts', 'tsx'].includes(extension)) return 'code/typescript';
  if (['py'].includes(extension)) return 'code/python';
  if (['java'].includes(extension)) return 'code/java';
  if (['cpp', 'c', 'h'].includes(extension)) return 'code/cpp';
  if (['cs'].includes(extension)) return 'code/csharp';
  if (['php'].includes(extension)) return 'code/php';
  if (['rb'].includes(extension)) return 'code/ruby';
  if (['go'].includes(extension)) return 'code/go';
  if (['rs'].includes(extension)) return 'code/rust';
  if (['swift'].includes(extension)) return 'code/swift';
  if (['kt'].includes(extension)) return 'code/kotlin';
  if (['html', 'htm'].includes(extension)) return 'code/html';
  if (['css'].includes(extension)) return 'code/css';
  if (['scss', 'sass'].includes(extension)) return 'code/scss';
  if (['json'].includes(extension)) return 'code/json';
  if (['xml'].includes(extension)) return 'code/xml';
  if (['yaml', 'yml'].includes(extension)) return 'code/yaml';
  if (['sql'].includes(extension)) return 'code/sql';
  if (['sh', 'bash'].includes(extension)) return 'code/shell';
  
  // Other common types
  if (['exe', 'msi'].includes(extension)) return 'executable';
  if (['dmg', 'pkg'].includes(extension)) return 'installer';
  if (['iso'].includes(extension)) return 'disk-image';
  
  // Use MIME type as fallback
  if (mimeType) {
    if (mimeType.startsWith('text/')) return 'text';
    if (mimeType.startsWith('image/')) return mimeType;
    if (mimeType.startsWith('video/')) return mimeType;
    if (mimeType.startsWith('audio/')) return mimeType;
    if (mimeType.startsWith('application/')) return `application/${extension}`;
  }
  
  // Return the extension as the type for unknown files
  return extension || 'unknown';
}

// Helper function to extract text from different file types
async function extractTextFromFile(file) {
  const fileType = detectFileType(file);
  let text = '';

  try {
    switch (fileType) {
      case 'pdf':
        try {
          const pdfData = await pdfExtractJs.extract(file.path, {});
          console.log(`PDF extraction - Pages found: ${pdfData.pages.length}`);
          
          text = pdfData.pages.map((page, index) => {
            console.log(`Page ${index + 1} text length: ${page.text ? page.text.length : 0}`);
            return page.text || '';
          }).join('\n');
          
          console.log(`Total extracted text length: ${text.length}`);
          console.log(`First 200 chars: "${text.substring(0, 200)}"`);
          
          // If no text extracted, try to provide helpful message
          if (!text.trim()) {
            console.log("No text extracted from PDF - likely scanned/image-based");
            text = "This PDF appears to contain scanned images or non-selectable text. Please try uploading a PDF with selectable text, or convert this PDF to text first.";
          }
        } catch (pdfError) {
          console.error("PDF extraction error:", pdfError);
          text = "Error extracting text from PDF. The file may be corrupted or password protected.";
        }
        break;
      case 'doc':
      case 'docx':
        try {
          console.log(`Processing Word document: ${file.originalname}`);
          const docPath = path.join(__dirname, 'uploads', file.filename);
          console.log(`Document path: ${docPath}`);
          
          const result = await mammoth.extractRawText({ path: docPath });
          text = result.value;
          
          console.log(`Word document text length: ${text.length}`);
          console.log(`First 200 chars: "${text.substring(0, 200)}"`);
          
          if (!text.trim()) {
            console.log("No text extracted from Word document");
            text = "No readable text found in this Word document.";
          }
        } catch (docError) {
          console.error("Word document extraction error:", docError);
          text = "Error extracting text from Word document.";
        }
        break;
      case 'presentation':
        try {
          console.log(`Processing PowerPoint presentation: ${file.originalname}`);
          const pptPath = path.join(__dirname, 'uploads', file.filename);
          console.log(`Presentation path: ${pptPath}`);
          
          // Use officeparser to extract text from PowerPoint
          const extractedText = await new Promise((resolve, reject) => {
            officeParser.parseOfficeAsync(pptPath, (data, err) => {
              if (err) {
                console.error("OfficeParser error:", err);
                reject(err);
              } else {
                console.log("OfficeParser success, data type:", typeof data);
                console.log("OfficeParser data:", data);
                resolve(data);
              }
            });
          });
          
          text = extractedText || '';
          
          console.log(`PowerPoint text extraction - Length: ${text.length}`);
          console.log(`First 200 chars: "${text.substring(0, 200)}"`);
          
          if (!text.trim()) {
            console.log("No text extracted from PowerPoint presentation");
            text = `PowerPoint Presentation: ${file.originalname}\n\nNo readable text found in this PowerPoint presentation. The file may contain only images or the slides may not have extractable text content.\n\nFile size: ${(file.size / 1024).toFixed(2)} KB`;
          } else {
            // Add file context to the extracted text
            text = `PowerPoint Presentation: ${file.originalname}\n\n${text}`;
          }
          
        } catch (pptError) {
          console.error("PowerPoint extraction error:", pptError);
          text = `PowerPoint Presentation: ${file.originalname}\n\nError extracting text from PowerPoint presentation: ${pptError.message}\n\nThe file has been uploaded but text extraction failed. You can still reference this file in our conversation.\n\nFile size: ${(file.size / 1024).toFixed(2)} KB`;
        }
        break;
      case 'txt':
      case 'markdown':
      case 'rtf':
      case 'csv':
      case 'text':
        const filePath = path.join(__dirname, 'uploads', file.filename);
        text = fs.readFileSync(filePath, 'utf-8');
        break;
      // Handle code files
      case 'code/javascript':
      case 'code/typescript':
      case 'code/python':
      case 'code/java':
      case 'code/cpp':
      case 'code/csharp':
      case 'code/php':
      case 'code/ruby':
      case 'code/go':
      case 'code/rust':
      case 'code/swift':
      case 'code/kotlin':
      case 'code/html':
      case 'code/css':
      case 'code/scss':
      case 'code/json':
      case 'code/xml':
      case 'code/yaml':
      case 'code/sql':
      case 'code/shell':
        const codePath = path.join(__dirname, 'uploads', file.filename);
        text = fs.readFileSync(codePath, 'utf-8');
        // Add some context about the file type
        text = `File: ${file.originalname} (${fileType})\n\n${text}`;
        break;
      // Handle other text-based files
      default:
        // Try to read as text if it might be a text file
        if (fileType.includes('text') || fileType === 'unknown' || 
            file.mimetype?.startsWith('text/') || 
            !file.mimetype?.includes('binary')) {
          try {
            const unknownPath = path.join(__dirname, 'uploads', file.filename);
            text = fs.readFileSync(unknownPath, 'utf-8');
            text = `File: ${file.originalname} (${fileType})\n\n${text}`;
          } catch (readError) {
            // If we can't read it as text, provide metadata instead
            text = `File uploaded: ${file.originalname}\nType: ${fileType}\nSize: ${(file.size / 1024).toFixed(2)} KB\n\nThis file type cannot be processed for text extraction, but it has been stored and can be referenced in our conversation.`;
          }
        } else {
          // For binary files, provide metadata
          text = `File uploaded: ${file.originalname}\nType: ${fileType}\nSize: ${(file.size / 1024).toFixed(2)} KB\n\nThis is a binary file that cannot be processed for text extraction, but it has been stored and can be referenced in our conversation.`;
        }
    }
  } catch (error) {
    console.error('Error extracting text:', error);
    // Provide helpful error information instead of generic error
    text = `File uploaded: ${file.originalname}\nType: ${fileType}\nSize: ${(file.size / 1024).toFixed(2)} KB\n\nError processing file: ${error.message}\n\nThe file has been stored and can be referenced in our conversation, but text extraction failed.`;
  }

  return text;
}

// Helper function to split text into chunks
function splitIntoChunks(text, chunkSize = 1000) {
  // Split by paragraphs first
  const paragraphs = text.split(/\n\s*\n/);
  const chunks = [];
  let currentChunk = "";
  let currentWordCount = 0;

  for (const paragraph of paragraphs) {
    const words = paragraph.split(/\s+/);

    // If a single paragraph is larger than chunk size, split it
    if (words.length > chunkSize) {
      for (let i = 0; i < words.length; i += chunkSize) {
        chunks.push(words.slice(i, i + chunkSize).join(" "));
      }
      continue;
    }

    // If adding this paragraph would exceed chunk size, start a new chunk
    if (currentWordCount + words.length > chunkSize && currentChunk !== "") {
      chunks.push(currentChunk);
      currentChunk = paragraph;
      currentWordCount = words.length;
    } else {
      // Otherwise add to current chunk
      if (currentChunk !== "") currentChunk += "\n\n";
      currentChunk += paragraph;
      currentWordCount += words.length;
    }
  }

  // Add the last chunk if it's not empty
  if (currentChunk !== "") {
    chunks.push(currentChunk);
  }

  return chunks;
}

// Get available models from Ollama
app.get("/api/models", async (req, res) => {
  try {
    console.log("Fetching models from Ollama...");

    const response = await ollamaAPI.get("/tags");
    console.log("Successfully connected to Ollama API");

    res.json(response.data);
  } catch (error) {
    console.error("Error fetching models:", error);
    res.status(500).json({
      error: "Failed to fetch models from Ollama",
      details: error.message,
    });
  }
});

// Image upload endpoint
app.post("/api/upload-image", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No image uploaded" });
    }

    const filePath = req.file.path;
    const fileExtension = path.extname(req.file.originalname).toLowerCase();
    
    // Check if file is an image
    if (!['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(fileExtension)) {
      return res.status(400).json({ error: "Unsupported image format" });
    }

    // Generate unique image ID
    const imageId = Date.now().toString();
    
    // Store image metadata
    app.locals.documents[imageId] = {
      filename: req.file.originalname,
      type: 'image',
      path: filePath,
      size: req.file.size,
      extension: fileExtension,
      textContent: "", // No text content for images
      fullText: "", // No full text for images
      chunks: [], // No chunks for images
      totalChunks: 0, // No chunks for images
      chunkCount: 0, // No chunks for images
      wordCount: 0 // No words for images
    };

    // Return image metadata
    res.json({
      id: imageId,
      filename: req.file.originalname,
      type: 'image',
      size: req.file.size,
      extension: fileExtension,
      textContent: "",
      fullText: "",
      chunks: [],
      totalChunks: 0,
      chunkCount: 0,
      wordCount: 0
    });
  } catch (error) {
    console.error("Error processing image:", error);
    res.status(500).json({ error: "Failed to process image" });
  }
});

// Serve uploaded images
app.get("/api/images/:id", (req, res) => {
  try {
    const imageId = req.params.id;
    const uploadsDir = path.join(__dirname, "uploads");
    
    // Find the image file that starts with the image ID
    const files = fs.readdirSync(uploadsDir);
    const imageFile = files.find(file => file.startsWith(imageId));
    
    if (!imageFile) {
      return res.status(404).json({ error: "Image not found" });
    }
    
    const imagePath = path.join(uploadsDir, imageFile);
    res.sendFile(imagePath);
  } catch (error) {
    console.error("Error serving image:", error);
    res.status(500).json({ error: "Failed to serve image" });
  }
});

// File upload endpoint for documents
app.post("/api/upload", upload.single("document"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const filePath = req.file.path;
    const fileExtension = path.extname(req.file.originalname).toLowerCase();
    let extractedText = "";
    let fileType = "document";

    // Process file based on type
    switch (fileExtension) {
      case '.pdf':
        try {
          const pdfData = await pdfExtractJs.extract(filePath, {});
          console.log(`PDF extraction - Pages found: ${pdfData.pages.length}`);
          
          extractedText = pdfData.pages.map((page, index) => {
            console.log(`Page ${index + 1} text length: ${page.text ? page.text.length : 0}`);
            return page.text || '';
          }).join('\n');
          
          console.log(`Total extracted text length: ${extractedText.length}`);
          console.log(`First 200 chars: "${extractedText.substring(0, 200)}"`);
          
          // If no text extracted, try to provide helpful message
          if (!extractedText.trim()) {
            console.log("No text extracted from PDF - likely scanned/image-based");
            extractedText = "This PDF appears to contain scanned images or non-selectable text. Please try uploading a PDF with selectable text, or convert this PDF to text first.";
          }
        } catch (pdfError) {
          console.error("PDF extraction error:", pdfError);
          extractedText = "Error extracting text from PDF. The file may be corrupted or password protected.";
        }
        break;
      case '.doc':
      case '.docx':
        try {
          console.log(`Processing Word document: ${req.file.originalname}`);
          const docPath = path.join(__dirname, 'uploads', req.file.filename);
          console.log(`Document path: ${docPath}`);
          
          const result = await mammoth.extractRawText({ path: docPath });
          extractedText = result.value;
          
          console.log(`Word document text length: ${extractedText.length}`);
          console.log(`First 200 chars: "${extractedText.substring(0, 200)}"`);
          
          if (!extractedText.trim()) {
            console.log("No text extracted from Word document");
            extractedText = "No readable text found in this Word document.";
          }
        } catch (docError) {
          console.error("Word document extraction error:", docError);
          extractedText = "Error extracting text from Word document.";
        }
        break;
      case '.txt':
      case '.md':
        extractedText = fs.readFileSync(filePath, 'utf8');
        break;
      case '.ppt':
      case '.pptx':
        // For PPT/PPTX files, we don't extract text content
        break;
      default:
        return res.status(400).json({ error: "Unsupported document type" });
    }

    // Generate unique document ID
    const docId = Date.now().toString();

    // Split text into chunks for better document navigation
    const chunks = extractedText ? splitIntoChunks(extractedText, 1000) : [];
    
    console.log(`Document processing complete:`);
    console.log(`- Extracted text length: ${extractedText ? extractedText.length : 0}`);
    console.log(`- Number of chunks created: ${chunks.length}`);
    console.log(`- First 100 chars of extracted text: "${extractedText ? extractedText.substring(0, 100) : 'NO TEXT'}"...`);
    
    // Ensure we have at least one chunk even if text extraction failed
    if (chunks.length === 0 && extractedText) {
      console.log("No chunks created but text exists, creating single chunk");
      chunks.push(extractedText);
    } else if (chunks.length === 0) {
      console.log("No text extracted and no chunks, creating placeholder chunk");
      const placeholderText = `Document: ${req.file.originalname}\n\nThis ${fileType} file was uploaded successfully but no text content could be extracted. The file may contain images, complex formatting, or be in a format that requires special processing.\n\nFile size: ${(req.file.size / 1024).toFixed(2)} KB\nFile type: ${fileType}`;
      chunks.push(placeholderText);
      if (!extractedText) {
        extractedText = placeholderText;
      }
    }

    // Store document metadata
    app.locals.documents[docId] = {
      filename: req.file.originalname,
      type: fileType,
      path: filePath,
      size: req.file.size,
      extension: fileExtension,
      textContent: extractedText, // Keep original for backward compatibility
      fullText: extractedText, // Add fullText property
      chunks: chunks, // Add chunks array
      totalChunks: chunks.length, // Add totalChunks count
      chunkCount: chunks.length, // Add chunkCount property
      wordCount: extractedText ? extractedText.split(/\s+/).length : 0 // Add word count
    };

    // Return document metadata
    res.json({
      id: docId,
      filename: req.file.originalname,
      type: fileType,
      size: req.file.size,
      extension: fileExtension,
      textContent: extractedText,
      fullText: extractedText,
      chunks: chunks,
      totalChunks: chunks.length,
      chunkCount: chunks.length,
      wordCount: extractedText ? extractedText.split(/\s+/).length : 0
    });
  } catch (error) {
    console.error("Error processing document:", error);
    res.status(500).json({ error: "Failed to process document" });
  }
});

// File upload endpoint for images
app.post("/api/upload-image", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const filePath = req.file.path;
    const fileExtension = path.extname(req.file.originalname).toLowerCase();
    let fileType = "image";

    // Validate image type
    if (!['.jpg', '.jpeg', '.png'].includes(fileExtension.toLowerCase())) {
      return res.status(400).json({ error: "Unsupported image format" });
    }

    // Generate unique image ID
    const imageId = Date.now().toString();

    // Store image metadata
    app.locals.documents[imageId] = {
      filename: req.file.originalname,
      type: fileType,
      path: filePath,
      size: req.file.size,
      extension: fileExtension,
      textContent: "", // No text content for images
      fullText: "", // No full text for images
      chunks: [], // No chunks for images
      totalChunks: 0, // No chunks for images
      chunkCount: 0, // No chunks for images
      wordCount: 0 // No words for images
    };

    // Return image metadata
    res.json({
      id: imageId,
      filename: req.file.originalname,
      type: fileType,
      size: req.file.size,
      extension: fileExtension,
      textContent: "",
      fullText: "",
      chunks: [],
      totalChunks: 0,
      chunkCount: 0,
      wordCount: 0
    });
  } catch (error) {
    console.error("Error processing image:", error);
    res.status(500).json({ error: "Failed to process image" });
  }
});

// File upload endpoint for media files
app.post("/api/upload-media", upload.single("media"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const filePath = req.file.path;
    const fileExtension = path.extname(req.file.originalname).toLowerCase();
    let fileType = "other";

    // Process file based on type
    switch (fileExtension) {
      case '.mov':
      case '.mp4':
        fileType = 'video';
        break;
      case '.mp3':
        fileType = 'audio';
        break;
      case '.ppt':
      case '.pptx':
        fileType = 'presentation';
        break;
      default:
        return res.status(400).json({ error: "Unsupported media type" });
    }

    // Generate unique media ID
    const mediaId = Date.now().toString();

    // Store media metadata
    app.locals.documents[mediaId] = {
      filename: req.file.originalname,
      type: fileType,
      path: filePath,
      size: req.file.size,
      extension: fileExtension,
      textContent: "", // No text content for media
      fullText: "", // No full text for media
      chunks: [], // No chunks for media
      totalChunks: 0, // No chunks for media
      chunkCount: 0, // No chunks for media
      wordCount: 0 // No words for media
    };

    // Return media metadata
    res.json({
      id: mediaId,
      filename: req.file.originalname,
      type: fileType,
      size: req.file.size,
      extension: fileExtension,
      textContent: "",
      fullText: "",
      chunks: [],
      totalChunks: 0,
      chunkCount: 0,
      wordCount: 0
    });
  } catch (error) {
    console.error("Error processing media file:", error);
    res.status(500).json({ error: "Failed to process media file" });
  }
});

// Get document metadata
app.get("/api/document/:id", (req, res) => {
  const docId = req.params.id;

  if (!app.locals.documents || !app.locals.documents[docId]) {
    return res.status(404).json({ error: "Document not found" });
  }

  const doc = app.locals.documents[docId];

  res.json({
    id: docId,
    filename: doc.filename,
    wordCount: doc.wordCount,
    pageEstimate: Math.ceil(doc.wordCount / 500),
    chunkCount: doc.totalChunks,
    preview:
      doc.fullText.substring(0, 200) + (doc.fullText.length > 200 ? "..." : ""),
  });
});

// Get document chunk by index
app.get("/api/document/:id/chunk/:index", (req, res) => {
  const docId = req.params.id;
  const chunkIndex = parseInt(req.params.index);

  if (!app.locals.documents || !app.locals.documents[docId]) {
    return res.status(404).json({ error: "Document not found" });
  }

  const doc = app.locals.documents[docId];

  if (chunkIndex < 0 || chunkIndex >= doc.totalChunks) {
    return res.status(400).json({ error: "Chunk index out of range" });
  }

  res.json({
    id: docId,
    filename: doc.filename,
    chunkIndex: chunkIndex,
    content: doc.chunks[chunkIndex],
    totalChunks: doc.totalChunks,
  });
});

// Search within document
app.post("/api/document/:id/search", (req, res) => {
  const docId = req.params.id;
  const { query } = req.body;

  if (!query) {
    return res.status(400).json({ error: "Search query is required" });
  }

  if (!app.locals.documents || !app.locals.documents[docId]) {
    return res.status(404).json({ error: "Document not found" });
  }

  const doc = app.locals.documents[docId];
  const searchQuery = query.toLowerCase();

  // Find chunks containing the search term
  const results = doc.chunks
    .map((chunk, index) => {
      const lowerChunk = chunk.toLowerCase();
      const matches = (lowerChunk.match(new RegExp(searchQuery, "g")) || [])
        .length;
      return { chunkIndex: index, content: chunk, matches };
    })
    .filter((item) => item.matches > 0)
    .sort((a, b) => b.matches - a.matches);

  res.json({
    id: docId,
    query: query,
    totalMatches: results.length,
    results: results.map((r) => ({
      chunkIndex: r.chunkIndex,
      matches: r.matches,
      preview: r.content.substring(0, 200) + "...",
    })),
  });
});

// Enhanced chat endpoint that uses document references
app.post("/api/chat", async (req, res) => {
  try {
    const {
      model,
      messages,
      systemPrompt,
      documentId,
      mode = "auto",
      chunkIndices = [],
      searchQuery = "",
    } = req.body;

    console.log("Chat request received for model:", model);
    console.log("Full request body:", JSON.stringify(req.body, null, 2));

    if (!model) {
      return res.status(400).json({
        error: "Model is required",
        details: "No model specified in request"
      });
    }

    // Format messages for Ollama
    const ollamaMessages = messages.map((msg) => ({
      role: msg.role,
      content: msg.content,
    }));

    // Add system prompt if provided
    if (systemPrompt) {
      ollamaMessages.unshift({
        role: "system",
        content: systemPrompt,
      });
    }

    // Process document if provided
    if (documentId && app.locals.documents[documentId]) {
      const doc = app.locals.documents[documentId];

      // Get the last user message
      const lastUserMsgIndex = ollamaMessages.findIndex(
        (msg) => msg.role === "user"
      );

      if (lastUserMsgIndex !== -1) {
        let docContent = "";

        // Handle different document processing modes
        switch (mode) {
          case "summary":
            // For summary, include metadata and text content
            docContent = `\n\nDocument: ${doc.filename}\n`;
            docContent += `Total length: ~${Math.ceil(doc.wordCount / 500)} pages (${doc.wordCount} words)\n`;
            
            if (doc.totalChunks > 0) {
              docContent += `\nFirst section:\n${doc.chunks[0]}\n`;
              // Add a middle chunk for context if document is large
              if (doc.totalChunks > 2) {
                const middleIndex = Math.floor(doc.totalChunks / 2);
                docContent += `\nMiddle section:\n${doc.chunks[middleIndex]}\n`;
              }
              // Add the last chunk
              if (doc.totalChunks > 1) {
                docContent += `\nLast section:\n${doc.chunks[doc.totalChunks - 1]}`;
              }
            } else {
              // No chunks available, use full text
              docContent += `\nContent:\n${doc.fullText || doc.textContent || 'No text content available'}`;
            }
            break;

          case "specific_chunks":
            // Include only specific chunks requested
            if (doc.totalChunks > 0) {
              if (chunkIndices.length === 0) {
                // If no specific chunks requested, use first chunk
                chunkIndices = [0];
              }

              docContent = `\n\nDocument: ${doc.filename}\n`;
              chunkIndices.forEach((idx) => {
                if (idx >= 0 && idx < doc.totalChunks) {
                  docContent += `\nSection ${idx + 1} of ${doc.totalChunks}:\n${doc.chunks[idx]}\n`;
                }
              });
            } else {
              // No chunks available, use full text
              docContent = `\n\nDocument: ${doc.filename}\n`;
              docContent += `Content:\n${doc.fullText || doc.textContent || 'No text content available'}`;
            }
            break;

          case "search":
            // Find chunks matching search query
            if (!searchQuery) {
              docContent = `\n\nDocument: ${doc.filename}\n`;
              docContent += `Please provide a search term to find relevant sections in this ${Math.ceil(doc.wordCount / 500)}-page document.`;
              break;
            }

            const query = searchQuery.toLowerCase();
            
            if (doc.totalChunks > 0) {
              const relevantChunks = doc.chunks
                .map((chunk, idx) => {
                  const matches = (
                    chunk.toLowerCase().match(new RegExp(query, "g")) || []
                  ).length;
                  return { chunk, idx, matches };
                })
                .filter((item) => item.matches > 0)
                .sort((a, b) => b.matches - a.matches)
                .slice(0, 3); // Get top 3 relevant chunks

              docContent = `\n\nDocument: ${doc.filename}\n`;
              docContent += `Searching for: "${searchQuery}"\n`;

              if (relevantChunks.length > 0) {
                relevantChunks.forEach(({ chunk, idx, matches }) => {
                  docContent += `\nSection ${idx + 1} (${matches} matches):\n${chunk}\n`;
                });
              } else {
                // If no matches, provide first chunk with notice
                docContent += `No exact matches found. Here's the beginning of the document:\n${doc.chunks[0]}\n`;
              }
            } else {
              // No chunks, search in full text
              const fullText = doc.fullText || doc.textContent || '';
              docContent = `\n\nDocument: ${doc.filename}\n`;
              docContent += `Searching for: "${searchQuery}"\n`;
              
              if (fullText.toLowerCase().includes(query)) {
                docContent += `Content (contains "${searchQuery}"):\n${fullText}`;
              } else {
                docContent += `No matches found for "${searchQuery}". Full content:\n${fullText}`;
              }
            }
            break;

          case "auto":
          default:
            // Auto mode - adapt based on document size
            docContent = `\n\nDocument: ${doc.filename}\n`;

            if (doc.totalChunks > 0) {
              if (doc.totalChunks <= 3) {
                // For small documents, include all chunks
                doc.chunks.forEach((chunk, idx) => {
                  docContent += `\nSection ${idx + 1} of ${doc.totalChunks}:\n${chunk}\n`;
                });
              } else {
                // For larger documents, include first 2-3 chunks
                const numChunks = Math.min(3, doc.totalChunks);
                for (let i = 0; i < numChunks; i++) {
                  docContent += `\nSection ${i + 1} of ${doc.totalChunks}:\n${doc.chunks[i]}\n`;
                }
                docContent += `\n... (${doc.totalChunks - numChunks} more sections available)`;
              }
            } else {
              // No chunks available, use full text
              docContent += `Content:\n${doc.fullText || doc.textContent || 'No text content available'}`;
            }
            break;
        }

        // Append document content to the last user message
        ollamaMessages[lastUserMsgIndex].content += docContent;
      }
    }

    console.log("Sending chat request to Ollama...");
    console.log("Ollama request payload:", JSON.stringify({
      model: model,
      messages: ollamaMessages,
      stream: false,
    }, null, 2));
    
    const response = await ollamaAPI.post("/chat", {
      model: model,
      messages: ollamaMessages,
      stream: false,
    });

    console.log("Chat response received from Ollama");
    res.json(response.data);
  } catch (error) {
    console.error("Error chatting with Ollama:", error);
    res.status(500).json({
      error: "Failed to communicate with Ollama",
      details: error.message,
    });
  }
});

// Export chat history as file
app.post("/api/export/chat", (req, res) => {
  try {
    const { messages, format } = req.body;
    const timestamp = Date.now();
    let content = "";
    let filename = "";
    let contentType = "";

    if (format === "json") {
      content = JSON.stringify(messages, null, 2);
      filename = `chat_history_${timestamp}.json`;
      contentType = "application/json";
    } else {
      // Default to text format
      content = messages
        .map((msg) => `${msg.role.toUpperCase()}: ${msg.content}`)
        .join("\n\n");
      filename = `chat_history_${timestamp}.txt`;
      contentType = "text/plain";
    }

    const filePath = path.join(downloadsDir, filename);
    fs.writeFileSync(filePath, content);

    res.json({
      success: true,
      filename,
      downloadUrl: `/api/download/${filename}`,
    });
  } catch (error) {
    console.error("Error exporting chat:", error);
    res.status(500).json({ error: "Failed to export chat history" });
  }
});

// Create and save file from content
app.post("/api/generate/file", (req, res) => {
  try {
    const { content, filename, contentType } = req.body;

    if (!content || !filename) {
      return res
        .status(400)
        .json({ error: "Content and filename are required" });
    }

    // Sanitize filename to prevent directory traversal
    const sanitizedFilename = path.basename(filename);
    const timestamp = Date.now();
    const uniqueFilename = `${timestamp}-${sanitizedFilename}`;
    const filePath = path.join(downloadsDir, uniqueFilename);

    fs.writeFileSync(filePath, content);

    res.json({
      success: true,
      filename: uniqueFilename,
      downloadUrl: `/api/download/${uniqueFilename}`,
    });
  } catch (error) {
    console.error("Error generating file:", error);
    res.status(500).json({ error: "Failed to generate file" });
  }
});

// Download file
app.get("/api/download/:filename", (req, res) => {
  try {
    const filename = req.params.filename;
    // Sanitize filename to prevent directory traversal
    const sanitizedFilename = path.basename(filename);
    const filePath = path.join(downloadsDir, sanitizedFilename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: "File not found" });
    }

    res.download(filePath);
  } catch (error) {
    console.error("Error downloading file:", error);
    res.status(500).json({ error: "Failed to download file" });
  }
});

// Video analysis functions
async function extractVideoFrames(videoPath, outputDir, frameCount = 5) {
  return new Promise((resolve, reject) => {
    const frameFiles = [];
    
    // Create output directory if it doesn't exist
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    ffmpeg(videoPath)
      .on('end', () => {
        console.log('Frame extraction completed');
        resolve(frameFiles);
      })
      .on('error', (err) => {
        console.error('Error extracting frames:', err);
        reject(err);
      })
      .on('filenames', (filenames) => {
        filenames.forEach(filename => {
          frameFiles.push(path.join(outputDir, filename));
        });
      })
      .screenshots({
        count: frameCount,
        folder: outputDir,
        filename: 'frame-%i.png',
        size: '640x480'
      });
  });
}

async function analyzeFrameWithLLaVA(imagePath, frameNumber, totalFrames, prompt = null, visionModel = 'llama3.2-vision:11b') {
  try {
    // Convert image to base64
    const imageBuffer = fs.readFileSync(imagePath);
    const base64Image = imageBuffer.toString('base64');
    
    // Simple frame description prompt
    const framePrompt = prompt || `Describe what you see in this video frame (${frameNumber} of ${totalFrames}). Include details about people, objects, actions, text, and the overall scene.`;
    
    // Call Ollama with selected vision model
    const response = await ollamaAPI.post('/generate', {
      model: visionModel,
      prompt: framePrompt,
      images: [base64Image],
      stream: false
    });
    
    return response.data.response;
  } catch (error) {
    console.error(`Error analyzing frame with ${visionModel}:`, error);
    return `Error analyzing frame ${frameNumber}: ${error.message}`;
  }
}

async function transcribeAudio(audioPath, whisperModel = 'whisper-base') {
  return new Promise((resolve, reject) => {
    // Determine model file based on whisper model selection
    let modelFile;
    if (whisperModel === 'whisper-tiny') {
      modelFile = 'ggml-tiny.en.bin';
    } else {
      modelFile = 'ggml-base.en.bin'; // default to base
    }
    
    // Use whisper-cli with the selected model
    const modelPath = path.join(__dirname, 'models', modelFile);
    const whisperCommand = `whisper-cli -m "${modelPath}" -f "${audioPath}" -nt`;
    
    console.log(`Transcribing audio with ${whisperModel} model...`);
    
    exec(whisperCommand, (error, stdout, stderr) => {
      if (error) {
        console.log(`Whisper-cli failed with ${whisperModel}:`, error.message);
        resolve(`Audio extracted from video but transcription failed.\nError: ${error.message}\nTo enable transcription, ensure whisper-cpp is properly installed: brew install whisper-cpp`);
        return;
      }
      
      try {
        // whisper-cli outputs directly to stdout
        if (stdout && stdout.trim()) {
          const transcript = stdout.trim();
          console.log(`Transcription successful with ${whisperModel}:`, transcript.substring(0, 100) + '...');
          resolve(transcript);
        } else {
          resolve('Transcription completed but no text output received.');
        }
      } catch (readError) {
        console.error('Error processing transcription output:', readError);
        resolve('Transcription completed but could not process output.');
      }
    });
  });
}

async function extractAudioFromVideo(videoPath) {
  return new Promise((resolve, reject) => {
    const audioPath = videoPath.replace(/\.[^/.]+$/, '.wav');
    
    ffmpeg(videoPath)
      .toFormat('wav')
      .audioFrequency(16000) // Whisper works best with 16kHz
      .audioChannels(1) // Mono audio
      .on('end', () => {
        console.log('Audio extraction completed');
        resolve(audioPath);
      })
      .on('error', (err) => {
        console.error('Error extracting audio:', err);
        reject(err);
      })
      .save(audioPath);
  });
}

// Enhanced video analysis endpoint
app.post("/api/analyze-video", upload.single("video"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No video file uploaded" });
    }

    const videoPath = req.file.path;
    const fileExtension = path.extname(req.file.originalname).toLowerCase();
    const whisperModel = req.body.whisperModel || 'whisper-base'; // Get whisper model from request
    const visionModel = 'llama3.2-vision:11b'; // Always use llama3.2-vision for video analysis
    
    console.log('Received whisperModel:', req.body.whisperModel);
    console.log('Using whisperModel:', whisperModel);
    console.log('Using visionModel:', visionModel);

    // Check if it's a video file
    if (!['.mp4', '.mov', '.avi', '.mkv', '.webm'].includes(fileExtension)) {
      return res.status(400).json({ error: "Unsupported video format" });
    }

    console.log(`Processing video for comprehensive analysis: ${req.file.originalname} (using ${visionModel} for vision, ${whisperModel} for audio)`);

    // Create temporary directory for frames
    const framesDir = path.join(__dirname, 'temp_frames', Date.now().toString());
    
    try {
      // Extract frames from video
      const frameFiles = await extractVideoFrames(videoPath, framesDir, 5);
      
      // Analyze each frame with selected vision model
      const frameAnalyses = [];
      for (let i = 0; i < frameFiles.length; i++) {
        const analysis = await analyzeFrameWithLLaVA(
          frameFiles[i], 
          i + 1, 
          frameFiles.length, 
          `Analyze this video frame (${i + 1}/${frameFiles.length}). Describe the scene, objects, people, actions, text, and any other details.`,
          visionModel
        );
        frameAnalyses.push(`Frame ${i + 1}: ${analysis}`);
      }
      
      // Extract and transcribe audio
      const audioPath = await extractAudioFromVideo(videoPath);
      const transcript = await transcribeAudio(audioPath, whisperModel);
      
      // Combine visual and audio analysis
      const fullAnalysis = `VIDEO ANALYSIS REPORT
==========================================

📹 VISUAL ANALYSIS:
${frameAnalyses.join('\n\n')}

🎤 AUDIO TRANSCRIPTION:
${transcript}

📊 SUMMARY:
This video contains ${frameFiles.length} analyzed frames and ${transcript.split(' ').length} words of transcribed audio content.

You can now chat with the AI about:
- What you see in the video frames
- The spoken content and dialogue
- Speaking patterns and delivery
- Visual elements and scenes
- Any specific questions about the content

Ask me anything about this video analysis!`;

      // Create document-like structure for the analysis
      const chunks = splitIntoChunks(fullAnalysis, 1000);
      const docId = Date.now().toString();
      
      // Store analysis as a document
      if (!app.locals.documents) {
        app.locals.documents = {};
      }
      
      app.locals.documents[docId] = {
        filename: `${req.file.originalname} (Video Analysis)`,
        fullText: fullAnalysis,
        chunks: chunks,
        totalChunks: chunks.length,
        chunkCount: chunks.length,
        wordCount: fullAnalysis.split(/\s+/).length,
        type: 'video_analysis',
        originalVideo: req.file.originalname,
        videoPath: videoPath,
        audioPath: audioPath, // Keep audio file for download
        frameAnalyses: frameAnalyses,
        transcript: transcript, // Store transcript separately for export
        coachingFocus: 'video'
      };

      // Clean up temporary files (but keep audio for download)
      try {
        // Don't delete audio file - keep it for download
        // if (fs.existsSync(audioPath)) {
        //   fs.unlinkSync(audioPath);
        // }
        // Clean up frame files
        frameFiles.forEach(frameFile => {
          if (fs.existsSync(frameFile)) {
            fs.unlinkSync(frameFile);
          }
        });
        // Remove frames directory
        if (fs.existsSync(framesDir)) {
          fs.rmdirSync(framesDir);
        }
      } catch (cleanupError) {
        console.log('Could not clean up temporary files:', cleanupError.message);
      }

      res.json({
        id: docId,
        filename: `${req.file.originalname} (Video Analysis)`,
        wordCount: fullAnalysis.split(/\s+/).length,
        pageEstimate: Math.ceil(fullAnalysis.split(/\s+/).length / 500),
        chunkCount: chunks.length,
        preview: fullAnalysis.substring(0, 500) + (fullAnalysis.length > 500 ? "..." : ""),
        type: 'video_analysis',
        frameCount: frameFiles.length
      });

    } catch (processingError) {
      throw processingError;
    }

  } catch (error) {
    console.error("Error analyzing video:", error);
    res.status(500).json({ 
      error: "Failed to analyze video", 
      details: error.message,
      suggestions: [
        "Make sure ffmpeg is installed: brew install ffmpeg",
        "Make sure llama3.2-vision model is installed in Ollama: ollama pull llama3.2-vision:11b"
      ]
    });
  }
});

// Audio analysis endpoint
app.post("/api/analyze-audio", upload.single("audio"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No audio file uploaded" });
    }

    const audioPath = req.file.path;
    const audioFilename = req.file.originalname;
    console.log(`Processing audio file: ${audioFilename}`);

    // Convert audio to WAV format for whisper if needed
    const wavPath = audioPath.replace(path.extname(audioPath), '.wav');
    
    await new Promise((resolve, reject) => {
      ffmpeg(audioPath)
        .toFormat('wav')
        .audioFrequency(16000) // Whisper works best with 16kHz
        .audioChannels(1) // Mono audio
        .save(wavPath)
        .on('end', resolve)
        .on('error', reject);
    });

    // Transcribe audio using whisper-cpp
    const modelPath = path.join(__dirname, 'models', 'ggml-base.en.bin');
    const transcript = await new Promise((resolve, reject) => {
      exec(`whisper-cli -m "${modelPath}" -f "${wavPath}" -nt`, (error, stdout, stderr) => {
        if (error) {
          console.error("Whisper error:", error);
          reject(new Error(`Whisper transcription failed: ${error.message}`));
          return;
        }
        resolve(stdout.trim());
      });
    });

    if (!transcript) {
      throw new Error("No transcript generated from audio");
    }

    // Create comprehensive analysis report
    const fullAnalysis = `AUDIO TRANSCRIPTION REPORT
Generated: ${new Date().toLocaleString()}
File: ${audioFilename}
Duration: Processing complete

🎤 AUDIO TRANSCRIPTION:
${transcript}

📝 ANALYSIS SUMMARY:
This audio file has been successfully transcribed using Whisper AI technology. The transcript captures all spoken content and can be searched and analyzed for specific topics, speakers, or content.
`;

    // Split into chunks for better searchability
    const chunks = [];
    const chunkSize = 1000;
    const words = transcript.split(' ');
    
    for (let i = 0; i < words.length; i += chunkSize) {
      const chunkWords = words.slice(i, i + chunkSize);
      chunks.push({
        content: chunkWords.join(' '),
        index: Math.floor(i / chunkSize),
        type: 'transcript'
      });
    }

    // If transcript is short, create at least one chunk
    if (chunks.length === 0) {
      chunks.push({
        content: transcript,
        index: 0,
        type: 'transcript'
      });
    }

    // Store document data
    const documentId = Date.now().toString();
    const documentData = {
      id: documentId,
      title: `Audio: ${audioFilename}`,
      type: "audio",
      originalAudio: audioFilename,
      transcript: transcript,
      content: fullAnalysis,
      chunks: chunks,
      chunkCount: chunks.length,
      createdAt: new Date().toISOString(),
    };

    // Store in app.locals for persistence
    if (!app.locals.documents) {
      app.locals.documents = {};
    }
    app.locals.documents[documentId] = documentData;

    // Clean up temporary files
    try {
      fs.unlinkSync(audioPath);
      fs.unlinkSync(wavPath);
    } catch (cleanupError) {
      console.warn("Error cleaning up temporary files:", cleanupError);
    }

    res.json(documentData);

  } catch (error) {
    console.error("Error analyzing audio:", error);
    res.status(500).json({ 
      error: "Failed to analyze audio", 
      details: error.message,
      suggestions: [
        "Make sure ffmpeg is installed: brew install ffmpeg",
        "Make sure whisper-cpp is installed: brew install whisper-cpp",
        "Make sure the whisper model is downloaded: curl -L -o models/ggml-base.en.bin https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.en.bin"
      ]
    });
  }
});

// Export transcript as Word document
app.post("/api/export-transcript", async (req, res) => {
  try {
    const { documentId, filename } = req.body;

    console.log(`Export transcript request - Document ID: ${documentId}, Filename: ${filename}`);

    if (!documentId) {
      return res.status(400).json({ error: "Document ID is required" });
    }

    // Get the document from storage
    const document = app.locals.documents?.[documentId];
    if (!document) {
      console.log(`Document not found for ID: ${documentId}`);
      console.log(`Available documents:`, Object.keys(app.locals.documents || {}));
      return res.status(404).json({ error: "Document not found" });
    }

    console.log(`Document found - Type: ${document.type}, Has transcript: ${!!document.transcript}`);
    console.log(`Document properties:`, Object.keys(document));

    // Check if document has transcript - handle different document types
    let transcriptText = null;
    
    if (document.transcript) {
      transcriptText = document.transcript;
    } else if (document.textContent && (document.type === 'video' || document.type === 'audio')) {
      // For video/audio documents, the transcript might be in textContent
      transcriptText = document.textContent;
    } else if (document.fullText && (document.type === 'video' || document.type === 'audio')) {
      // Or in fullText
      transcriptText = document.fullText;
    }

    if (!transcriptText) {
      console.log(`No transcript found for document type: ${document.type}`);
      return res.status(400).json({ 
        error: "No transcript available for this document",
        details: `Document type: ${document.type}, Available properties: ${Object.keys(document).join(', ')}`
      });
    }

    console.log(`Transcript found - Length: ${transcriptText.length} characters`);

    // Create Word document with transcript only
    const doc = new Document({
      sections: [{
        properties: {},
        children: [
          new Paragraph({
            text: `Transcript: ${document.originalAudio || document.filename}`,
            heading: HeadingLevel.TITLE,
          }),
          new Paragraph({
            text: `Generated: ${new Date().toLocaleString()}`,
            spacing: { after: 400 },
          }),
          new Paragraph({
            text: "TRANSCRIPT:",
            heading: HeadingLevel.HEADING_1,
            spacing: { after: 200 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: transcriptText,
              })
            ],
            spacing: { after: 200 },
          })
        ],
      }],
    });

    // Generate buffer
    const buffer = await Packer.toBuffer(doc);

    // Save to downloads directory
    const timestamp = Date.now();
    const sanitizedFilename = (filename || `transcript_${document.originalAudio || document.filename || 'document'}`).replace(/[^a-zA-Z0-9.-]/g, '_');
    const uniqueFilename = `${timestamp}-${sanitizedFilename}.docx`;
    const filePath = path.join(downloadsDir, uniqueFilename);

    fs.writeFileSync(filePath, buffer);

    console.log(`Transcript exported successfully to: ${filePath}`);

    res.json({
      success: true,
      filename: uniqueFilename,
      downloadUrl: `/api/download/${uniqueFilename}`,
      message: "Transcript exported successfully"
    });
  } catch (error) {
    console.error("Error exporting transcript:", error);
    res.status(500).json({ 
      error: "Failed to export transcript", 
      details: error.message 
    });
  }
});

// Test endpoint for docx functionality
app.get("/api/test-docx", async (req, res) => {
  try {
    const doc = new Document({
      sections: [{
        properties: {},
        children: [
          new Paragraph({
            text: "Test Document",
            heading: HeadingLevel.TITLE,
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: "This is a test document to verify docx functionality.",
              })
            ],
          })
        ],
      }],
    });

    const buffer = await Packer.toBuffer(doc);
    
    res.setHeader('Content-Disposition', 'attachment; filename="test.docx"');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Length', buffer.length);
    res.send(buffer);
  } catch (error) {
    console.error("Test docx error:", error);
    res.status(500).json({ error: "Test failed", details: error.message });
  }
});

// Export analysis report as Word document
app.post("/api/export-analysis", async (req, res) => {
  try {
    console.log("Export analysis request received:", req.body);
    const { documentId, filename, analysisContent } = req.body;

    if (!analysisContent) {
      console.log("No analysis content provided");
      return res.status(400).json({ error: "Analysis content is required" });
    }

    console.log("Analysis content length:", analysisContent.length);

    // Get the document from storage for metadata
    const document = app.locals.documents?.[documentId];
    const docTitle = document?.filename || filename || "AI Analysis Report";

    // Create Word document with proper formatting
    const doc = new Document({
      sections: [{
        properties: {},
        children: [
          new Paragraph({
            text: `AI Analysis: ${docTitle}`,
            heading: HeadingLevel.TITLE,
          }),
          new Paragraph({
            text: `Generated: ${new Date().toLocaleString()}`,
            spacing: { after: 400 },
          }),
          new Paragraph({
            text: "Analysis Content:",
            heading: HeadingLevel.HEADING_1,
            spacing: { after: 200 },
          }),
          ...analysisContent.split('\n').map(line => 
            new Paragraph({
              children: [
                new TextRun({
                  text: line,
                  break: line === '' ? 1 : 0,
                })
              ],
              spacing: { after: 200 },
            })
          )
        ],
      }],
    });

    // Generate buffer
    const buffer = await Packer.toBuffer(doc);

    // Create filename
    const safeFilename = (filename || document.filename || 'analysis-report')
      .replace(/[^a-z0-9]/gi, '_')
      .toLowerCase();
    const timestamp = Date.now();
    const docxFilename = `${safeFilename}_${timestamp}.docx`;

    // Set headers for download
    res.setHeader('Content-Disposition', `attachment; filename="${docxFilename}"`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Length', buffer.length);

    // Send the buffer
    res.send(buffer);

  } catch (error) {
    console.error("Error exporting analysis to Word:", error);
    console.error("Error stack:", error.stack);
    console.error("Request body:", req.body);
    res.status(500).json({ 
      error: "Failed to export analysis", 
      details: error.message,
      stack: error.stack
    });
  }
});

// Export audio endpoint
app.get("/api/export-audio/:documentId", (req, res) => {
  try {
    const { documentId } = req.params;
    const document = app.locals.documents?.[documentId];

    if (!document) {
      return res.status(404).json({ error: "Document not found" });
    }

    if (!document.audioPath || !fs.existsSync(document.audioPath)) {
      return res.status(404).json({ error: "Audio file not found. Audio may not be available for this document." });
    }

    const audioPath = document.audioPath;
    const filename = `${document.originalVideo || document.filename}_audio.wav`;

    res.setHeader('Content-Type', 'audio/wav');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    
    const fileStream = fs.createReadStream(audioPath);
    fileStream.pipe(res);
    
    fileStream.on('error', (error) => {
      console.error('Error streaming audio file:', error);
      res.status(500).json({ error: 'Error streaming audio file' });
    });

  } catch (error) {
    console.error("Error exporting audio:", error);
    res.status(500).json({ error: "Failed to export audio" });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
