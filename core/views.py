from django.shortcuts import render

def how_it_works(request):
    return render(request, 'core/how_it_works.html')

def pricing(request):
    return render(request, 'core/pricing.html')
def landing(request):
    return render(request, 'core/landing.html')


def chat(request):
    return render(request, 'core/chat.html')


def positions(request):
    # Jobs are now fetched via JavaScript from the backend API
    return render(request, 'core/positions.html')
