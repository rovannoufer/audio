from django.urls import path
from . import views

urlpatterns =[
    path('hello', views.transcribe_audio),
    path('sentiment', views.transcribe_sentiment),
    path('file', views.transcribe_sentiment_file)
]