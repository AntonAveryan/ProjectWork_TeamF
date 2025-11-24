from django.shortcuts import render

def landing(request):
    return render(request, 'core/landing.html')

def chat(request):
    # сюда позже прикрутите реальный чат
    return render(request, 'core/chat.html')

def positions(request):
    # сюда подставите результаты скрапера LinkedIn
    jobs = [
        {
            "company": "SAP",
            "title": "Full Stack Engineer",
            "location": "Walldorf",
            "description": "Build and maintain modern Web3 applications using Typescript, React, Node, and blockchain tools.",
            "url": "https://www.linkedin.com/jobs/view/123/",
        },
        # потом замените на реальные
    ]
    return render(request, 'core/positions.html', {"jobs": jobs})
