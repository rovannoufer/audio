const express = require('express');
const { AssemblyAI } = require('assemblyai');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const fsx = require('fs-extra');
const bodyParser = require('body-parser');
const multer = require('multer');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
ffmpeg.setFfmpegPath(ffmpegPath);
const { GoogleGenerativeAI } = require('@google/generative-ai');
const dotenv = require('dotenv');
dotenv.config();

const app = express();
const port = 3000;
console.log(GoogleGenerativeAI);
const client = new AssemblyAI({
  apiKey: '384b74d8e9354d69bba41e3ca0202010',
});

const upload = multer({ dest: 'uploads/' });

const genAI = new GoogleGenerativeAI({
  apiKey: process.env.GEMINI_KEY,
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

    console.log(transcript);
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









function extractAudio(inputVideoPath, outputAudioPath) {
  return new Promise((resolve, reject) => {
    ffmpeg(inputVideoPath)
      .outputOptions('-vn')
      .audioCodec('libmp3lame')
      .audioBitrate('128k')
      .save(outputAudioPath)
      .on('end', () => {
        console.log('Audio extraction completed');
        resolve();
      })
      .on('error', (err) => {
        console.error('Error during audio extraction:', err);
        reject(err);
      });
  });
}

app.post('/upload', upload.single('video'), async (req, res) => {
  const videoPath = req.file.path;
  const audioPath = path.join(__dirname, 'uploads', `${req.file.filename}.mp3`);

  try {
    await extractAudio(videoPath, audioPath);
    res.json({ audioPath });
  } catch (err) {
    console.error('Error processing video:', err);
    res.status(500).json({ error: 'Internal Server Error', details: err.message });
  }
});


app.post('/subtitle', async (req, res) => {
  const { audioPath, fileFormat = 'vtt' } = req.body;

  if (!audioPath) {
    return res.status(400).json({ error: 'Audio path is required' });
  }

  const baseUrl = 'https://api.assemblyai.com/v2';
  const headers = {
    authorization: '384b74d8e9354d69bba41e3ca0202010',
  };

  try {
    const audioData = await fsx.readFile(audioPath);
    const uploadResponse = await axios.post(`${baseUrl}/upload`, audioData, { headers });
    const uploadUrl = uploadResponse.data.upload_url;

    const data = { audio_url: uploadUrl };
    const response = await axios.post(`${baseUrl}/transcript`, data, { headers });
    const transcriptId = response.data.id;
    const pollingEndpoint = `${baseUrl}/transcript/${transcriptId}`;

    while (true) {
      const pollingResponse = await axios.get(pollingEndpoint, { headers });
      const transcriptionResult = pollingResponse.data;

      if (transcriptionResult.status === 'completed') {
        const subtitleFileUrl = `${baseUrl}/transcript/${transcriptId}/${fileFormat}`;
        const subtitleResponse = await axios.get(subtitleFileUrl, {
          headers,
          responseType: 'blob',
        });

        const filePath = path.join(__dirname, `subtitles.${fileFormat}`);
        await fsx.writeFile(filePath, subtitleResponse.data);

        res.download(filePath, `subtitles.${fileFormat}`, (err) => {
          if (err) {
            console.error('Error sending file:', err);
            res.status(500).send('Error sending file');
          }

          fs.unlink(filePath, (unlinkErr) => {
            if (unlinkErr) {
              console.error('Error deleting file:', unlinkErr);
            }
          });
        });
        break;
      } else if (transcriptionResult.status === 'error') {
        throw new Error(`Transcription failed: ${transcriptionResult.error}`);
      } else {
        await new Promise((resolve) => setTimeout(resolve, 3000));
      }
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error', details: error.message });
  }
});


app.post('/contentgeneration', async(req,res) => {

  try {
    const { prompt } = req.body; 
    
    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-pro', 
    });

    const result = await model.generateContentStream([{ text: prompt }]);
    console.log(result)
    let chunkText = "";
    for await (const chunk of result.stream) {
      chunkText += chunk.text();
    }
    console.log(chunkText);
    res.send({ chunkText });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
})



app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
