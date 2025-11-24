from django.urls import path
from . import views

urlpatterns = [
    path('', views.landing, name='landing'),
    path('chat/', views.chat, name='chat'),
    path('positions/', views.positions, name='positions'),
]
