from django.urls import path
from . import views

urlpatterns = [
    path('how-it-works/', views.how_it_works, name='how_it_works'),
    path('pricing/', views.pricing, name='pricing'),
    path('', views.landing, name='landing'),
    path('chat/', views.chat, name='chat'),
    path('positions/', views.positions, name='positions'),
    path('favorites/', views.favorites, name='favorites'),
]
