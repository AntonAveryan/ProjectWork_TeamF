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
    # пока моковые данные, позже подставите из скрапера
    jobs = [
        {
            "id": 1,
            "company": "SAP",
            "title": "Full Stack Engineer",
            "location": "Walldorf",
            "description": "Build and maintain modern Web3 applications using Typescript, React, Node, and blockchain tools. Remote or London role with a high-impact engineering focus.",
            "url": "https://www.linkedin.com/jobs/view/1/",
            "level": "Mid",
            "mode": "Remote",
            "date_posted": "2025-02-15",
        },
        {
            "id": 2,
            "company": "SAP",
            "title": "Frontend Engineer",
            "location": "Berlin",
            "description": "Work on modern React frontends with design systems and performance in mind.",
            "url": "https://www.linkedin.com/jobs/view/2/",
            "level": "Junior",
            "mode": "Hybrid",
            "date_posted": "2025-02-12",
        },
        {
            "id": 3,
            "company": "SAP",
            "title": "Backend Engineer",
            "location": "London",
            "description": "Focus on Node.js and cloud-native microservices with high scalability.",
            "url": "https://www.linkedin.com/jobs/view/3/",
            "level": "Senior",
            "mode": "On-site",
            "date_posted": "2025-02-10",
        },
        {
            "id": 4,
            "company": "SAP",
            "title": "Full Stack Engineer",
            "location": "Remote",
            "description": "End-to-end product development using Typescript, React, Node.",
            "url": "https://www.linkedin.com/jobs/view/4/",
            "level": "Mid",
            "mode": "Remote",
            "date_posted": "2025-02-05",
        },
    ]
    return render(request, 'core/positions.html', {"jobs": jobs})
