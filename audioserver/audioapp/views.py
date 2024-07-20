from django.http import JsonResponse, HttpResponse
import assemblyai as aai
from django.views.decorators.csrf import csrf_exempt
import json
import os
import tempfile


@csrf_exempt
def transcribe_audio(request):
    if request.method == 'POST':
        try:
            body_unicode = request.body.decode('utf-8')
            body_data = json.loads(body_unicode)
            file_url = body_data['file_url']
            
            aai.settings.api_key = "384b74d8e9354d69bba41e3ca0202010"
            transcriber = aai.Transcriber()
            # config = aai.TranscriptionConfig(language_code="en")

            transcript = transcriber.transcribe(file_url)
            transcript_text = transcript.text if hasattr(transcript, 'text') else "No text found in transcript"
            
            response_data = {
                'message': 'File uploaded successfully',
                'transcript': transcript_text
            }
            
            return JsonResponse(response_data, status=201)
        except KeyError:
            return JsonResponse({'error': 'File URL not provided'}, status=400)
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=500)

    return JsonResponse({'error': 'Invalid request'}, status=400)


@csrf_exempt
def transcribe_sentiment(request):
    if request.method == 'POST':
        try:
            body_unicode = request.body.decode('utf-8')
            body_data = json.loads(body_unicode)
            file_url = body_data.get('file_url')
            
            if not file_url:
                return JsonResponse({'error': 'File URL not provided'}, status=400)
            
            aai.settings.api_key = "384b74d8e9354d69bba41e3ca0202010"
            transcriber = aai.Transcriber()
            config = aai.TranscriptionConfig(sentiment_analysis=True)

            transcript = transcriber.transcribe(file_url, config)
            
            sentiment_results = []
            for sentiment_result in transcript.sentiment_analysis:
                sentiment_results.append({
                    'text': sentiment_result.text,
                    'sentiment': sentiment_result.sentiment,
                    'confidence': sentiment_result.confidence,
                    'timestamp': {
                        'start': sentiment_result.start,
                        'end': sentiment_result.end
                    }
                })

            response_data = {
                'message': 'File processed successfully',
                'sentiment_results': sentiment_results
            }
            
            return JsonResponse(response_data, status=201)
        except KeyError:
            return JsonResponse({'error': 'Invalid request payload'}, status=400)
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=500)

    return JsonResponse({'error': 'Invalid request method'}, status=400)


@csrf_exempt
def transcribe_sentiment_file(request):
    if request.method == 'POST':
        try:
            body_unicode = request.body.decode('utf-8')
            body_data = json.loads(body_unicode)
            file_url = body_data.get('file_url')
            
            if not file_url:
                return JsonResponse({'error': 'File URL not provided'}, status=400)
            
            aai.settings.api_key = "384b74d8e9354d69bba41e3ca0202010"
            transcriber = aai.Transcriber()
            config = aai.TranscriptionConfig(sentiment_analysis=True)

            transcript = transcriber.transcribe(file_url, config)
            
            sentiment_results = []
            for sentiment_result in transcript.sentiment_analysis:
                sentiment_results.append({
                    'text': sentiment_result.text,
                    'sentiment': sentiment_result.sentiment,
                    'confidence': sentiment_result.confidence,
                    'timestamp': {
                        'start': sentiment_result.start,
                        'end': sentiment_result.end
                    }
                })

            
            file_path = 'sentiment_analysis_results.txt'
            with open(file_path, 'w') as file:
                for result in sentiment_results:
                    file.write(f"Text: {result['text']}\n")
                    file.write(f"Sentiment: {result['sentiment']}\n")
                    file.write(f"Confidence: {result['confidence']}\n")
                    file.write(f"Timestamp: {result['timestamp']['start']} - {result['timestamp']['end']}\n\n")

            with open(file_path, 'r') as file:
                response = HttpResponse(file.read(), content_type='text/plain')
                response['Content-Disposition'] = f'attachment; filename="{os.path.basename(file_path)}"'

            
            return response
        except KeyError:
            return JsonResponse({'error': 'Invalid request payload'}, status=400)
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=500)

    return JsonResponse({'error': 'Invalid request method'}, status=400)