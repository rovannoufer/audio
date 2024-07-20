const express = require('express');
const { AssemblyAI } = require('assemblyai');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const port = 3000;

const client = new AssemblyAI({
  apiKey: '384b74d8e9354d69bba41e3ca0202010',
});


app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.post('/transcribe',async (req, res) => {
  try {
    const fileUrl = req.body.file_url;

    if (!fileUrl) {
      return res.status(400).json({ error: 'File URL not provided' });
    }

    const transcript = await client.transcripts.transcribe({
      audio: fileUrl,
    });

    res.json({ transcript: transcript.text });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});


app.post('/sentiment', async(req,res)=>{
    try{
        const fileUrl = req.body.file_url;

        const filename = req.body.files;

        
        const params = {
            audio: fileUrl,
            sentiment_analysis: true
        }
        
           const transcript = await client.transcripts.transcribe(params)
        
           let content = '';
           for (const result of transcript.sentiment_analysis_results) {
             content += `Text: ${result.text}\n`;
             content += `Sentiment: ${result.sentiment}\n`;
             content += `Confidence: ${result.confidence}\n`;
             content += `Timestamp: ${result.start} - ${result.end}\n\n`;
           }

        const filePath = path.join(__dirname, `${filename}.txt`);
        fs.writeFileSync(filePath, content);

        res.download(filePath, `${filename}.txt`, (err) => {
        if (err) {
            console.error('Error sending file:', err);
            res.status(500).json({ error: 'Error sending file' });
        }
    });
        }catch(error){
        console.error(error);
        res.status(500).json({ error: error.message });
    }
})

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
