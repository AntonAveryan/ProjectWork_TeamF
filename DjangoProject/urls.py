from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),

    # для смены языка
    path('i18n/', include('django.conf.urls.i18n')),

    # твои основные урлы
    path('', include('core.urls')),
]
