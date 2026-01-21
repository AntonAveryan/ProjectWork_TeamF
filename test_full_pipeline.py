"""
Full Pipeline Testing Script
Tests the complete workflow:
1. Register & Login
2. Upload PDF and extract career fields
3. Scrape jobs using career fields and skills
4. Save a favorite job
5. Chat with LLM career coach
"""
import sys
import json
import requests
import time
from pathlib import Path
from typing import Optional

# API base URL
BASE_URL = "http://localhost:8000"  # Change if your API runs on different port


def print_section(title: str):
    """Print a formatted section header"""
    print("\n" + "=" * 80)
    print(f"  {title}")
    print("=" * 80 + "\n")


def print_subsection(title: str):
    """Print a formatted subsection header"""
    print("\n" + "-" * 80)
    print(f"  {title}")
    print("-" * 80 + "\n")


def test_register_and_login() -> Optional[str]:
    """Register a random test user and log in to get access token"""
    print_section("STEP 0: USER REGISTRATION & LOGIN")

    import random
    username = f"test_user_{random.randint(1000, 9999)}"
    password = "test123"

    print(f"📝 Registering user: {username}")
    register_url = f"{BASE_URL}/register"
    try:
        resp = requests.post(
            register_url,
            json={"username": username, "password": password},
            timeout=10,
        )
        if resp.status_code == 201:
            print("✅ Registration successful")
        elif resp.status_code == 400:
            print("⚠️  Registration failed (maybe user exists), continuing to login...")
        else:
            print(f"❌ Registration error: {resp.status_code} - {resp.text}")
    except Exception as e:
        print(f"❌ Registration exception: {e}")

    print("\n🔐 Logging in...")
    login_url = f"{BASE_URL}/login"
    try:
        resp = requests.post(
            login_url,
            data={"username": username, "password": password},
            timeout=10,
        )
        if resp.status_code != 200:
            print(f"❌ Login failed: {resp.status_code} - {resp.text}")
            return None
        token = resp.json().get("access_token")
        print("✅ Login successful, got access token")
        return token
    except Exception as e:
        print(f"❌ Login exception: {e}")
        return None


def test_pdf_upload(pdf_path: str, token: Optional[str] = None) -> Optional[dict]:
    """Test PDF upload and career field extraction"""
    print_section("STEP 1: PDF UPLOAD & CAREER FIELD EXTRACTION")
    
    if not Path(pdf_path).exists():
        print(f"❌ Error: PDF file not found: {pdf_path}")
        return None
    
    print(f"📄 Uploading PDF: {pdf_path}")
    
    url = f"{BASE_URL}/extract-text"
    headers = {}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    
    try:
        with open(pdf_path, 'rb') as f:
            files = {'file': (Path(pdf_path).name, f, 'application/pdf')}
            response = requests.post(url, files=files, headers=headers, timeout=120)
        
        if response.status_code == 200:
            data = response.json()
            print("✅ PDF uploaded and processed successfully!")
            print(f"\n📊 Results:")
            print(f"   - Filename: {data.get('filename', 'N/A')}")
            print(f"   - Pages: {data.get('pages', 0)}")
            print(f"   - Characters: {data.get('characters', 0)}")
            print(f"   - Saved to DB: {data.get('saved_to_db', False)}")
            
            career_fields = data.get('career_fields', [])
            print(f"   - Career Fields Found: {len(career_fields)}")
            
            if career_fields:
                print("\n💼 Career Fields:")
                for i, field in enumerate(career_fields, 1):
                    print(f"   {i}. {field.get('field', 'N/A')}")
                    print(f"      Summary: {field.get('summary', 'N/A')[:100]}...")
                    skills = field.get('key_skills_mentioned', [])
                    if skills:
                        print(f"      Skills: {', '.join(skills[:5])}")
            
            overall_summary = data.get('overall_summary', '')
            if overall_summary:
                print(f"\n📝 Overall Summary: {overall_summary[:200]}...")
            
            if 'error' in data and data['error']:
                print(f"\n⚠️  Warning: {data['error']}")
            
            return data
        else:
            print(f"❌ Error: {response.status_code} - {response.text}")
            return None
            
    except requests.exceptions.ConnectionError:
        print(f"❌ Error: Cannot connect to API at {BASE_URL}")
        print("   Make sure the FastAPI server is running!")
        return None
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        return None


def test_job_scraping(city: str, max_pages: int = 1) -> Optional[dict]:
    """Test job scraping endpoint"""
    print_section("STEP 2: JOB SCRAPING")
    
    print(f"🔍 Scraping jobs for city: {city}")
    print(f"📄 Max pages: {max_pages}")
    print("\n⏳ This may take a while (30-60 seconds)...")
    
    url = f"{BASE_URL}/scrape-jobs"
    params = {
        "city": city,
        "max_pages": max_pages
    }
    
    try:
        start_time = time.time()
        response = requests.get(url, params=params, timeout=120)
        elapsed_time = time.time() - start_time
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Job scraping completed in {elapsed_time:.2f} seconds!")
            
            print(f"\n📊 Results:")
            print(f"   - City: {data.get('city', 'N/A')}")
            print(f"   - Total Jobs Found: {data.get('total_jobs', 0)}")
            
            # Career field search results
            career_field_search = data.get('career_field_search', {})
            print(f"\n💼 Career Field Search:")
            career_field = career_field_search.get('career_field', {})
            print(f"   - Career Field: {career_field.get('field_name', 'N/A')}")
            print(f"   - Keywords: {career_field_search.get('keywords', 'N/A')}")
            print(f"   - Jobs Found: {career_field_search.get('jobs_found', 0)}")
            
            jobs_cf = career_field_search.get('jobs', [])
            if jobs_cf:
                print(f"\n   First 3 jobs from career field search:")
                for i, job in enumerate(jobs_cf[:3], 1):
                    print(f"   {i}. {job.get('title', 'N/A')}")
                    print(f"      Company: {job.get('company', 'N/A')}")
                    print(f"      Location: {job.get('location', 'N/A')}")
            
            # Skills search results
            skills_search = data.get('skills_search', {})
            print(f"\n🛠️  Skills Search:")
            skills = skills_search.get('skills', [])
            print(f"   - Skills Used: {', '.join([s.get('skill_name', '') for s in skills])}")
            print(f"   - Keywords: {skills_search.get('keywords', 'N/A')}")
            print(f"   - Jobs Found: {skills_search.get('jobs_found', 0)}")
            
            jobs_skills = skills_search.get('jobs', [])
            if jobs_skills:
                print(f"\n   First 3 jobs from skills search:")
                for i, job in enumerate(jobs_skills[:3], 1):
                    print(f"   {i}. {job.get('title', 'N/A')}")
                    print(f"      Company: {job.get('company', 'N/A')}")
                    print(f"      Location: {job.get('location', 'N/A')}")
            
            return data
        elif response.status_code == 404:
            error_data = response.json()
            print(f"❌ Error: {error_data.get('detail', 'No data found in database')}")
            print("   Please upload PDFs first to generate career fields and skills!")
            return None
        else:
            print(f"❌ Error: {response.status_code} - {response.text}")
            return None
            
    except requests.exceptions.ConnectionError:
        print(f"❌ Error: Cannot connect to API at {BASE_URL}")
        print("   Make sure the FastAPI server is running!")
        return None
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        return None


def test_favorites(jobs_result: dict, token: str) -> Optional[dict]:
    """Test saving a favorite job and listing favorites"""
    print_section("STEP 3: FAVORITES (SAVE & LIST)")

    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}

    # Pick first job from career_field_search or skills_search
    job = None
    if jobs_result:
        cf_jobs = (jobs_result.get("career_field_search") or {}).get("jobs") or []
        skills_jobs = (jobs_result.get("skills_search") or {}).get("jobs") or []
        if cf_jobs:
            job = cf_jobs[0]
        elif skills_jobs:
            job = skills_jobs[0]

    if not job:
        print("⚠️  No jobs available to save as favorite")
        return None

    payload = {
        "title": job.get("title") or "",
        "urn": job.get("urn"),
        "company": job.get("company"),
        "location": job.get("location"),
        "apply_link": job.get("apply_link"),
        "source": "linkedin",
    }

    print(f"💾 Saving favorite job: {payload['title']}")
    fav_url = f"{BASE_URL}/favorites"
    try:
        resp = requests.post(fav_url, headers=headers, json=payload, timeout=10)
        if resp.status_code not in (200, 201):
            print(f"❌ Failed to save favorite: {resp.status_code} - {resp.text}")
            return None
        fav = resp.json()
        print("✅ Favorite saved")

        # List favorites
        print("\n📥 Fetching favorites from backend...")
        list_url = f"{BASE_URL}/favorites"
        resp_list = requests.get(list_url, headers=headers, timeout=10)
        if resp_list.status_code == 200:
            favs = resp_list.json()
            print(f"✅ Favorites fetched: {len(favs)} items")
            if favs:
                first = favs[0]
                print(f"   First favorite: {first.get('title', 'N/A')} @ {first.get('company', 'N/A')}")
            return {"saved": fav, "all": favs}
        else:
            print(f"⚠️  Could not list favorites: {resp_list.status_code} - {resp_list.text}")
            return {"saved": fav, "all": []}
    except Exception as e:
        print(f"❌ Favorites exception: {e}")
        return None


def test_career_chat(token: str) -> Optional[str]:
    """Test /career-chat endpoint with a sample question"""
    print_section("STEP 4: CAREER CHAT WITH LLM")

    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    url = f"{BASE_URL}/career-chat"
    question = "What should I change in my profile to become more oriented towards data analytics?"

    print(f"🧠 Asking LLM: {question}")
    try:
        resp = requests.post(url, headers=headers, json={"message": question}, timeout=60)
        if resp.status_code != 200:
            print(f"❌ Career chat failed: {resp.status_code} - {resp.text}")
            return None
        data = resp.json()
        answer = data.get("answer", "")
        print("\n💬 LLM Answer (first 500 chars):")
        print(answer[:500] + ("..." if len(answer) > 500 else ""))
        return answer
    except Exception as e:
        print(f"❌ Career chat exception: {e}")
        return None


def save_results(pdf_result: dict, jobs_result: dict, favorites_result: dict, chat_answer: str, output_file: str = "pipeline_test_results.json"):
    """Save test results to JSON file"""
    results = {
        "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
        "pdf_extraction": pdf_result,
        "job_scraping": jobs_result,
        "favorites": favorites_result,
        "career_chat": chat_answer,
    }
    
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(results, f, indent=2, ensure_ascii=False)
    
    print(f"\n💾 Full results saved to: {output_file}")


def main():
    """Main testing function"""
    print_section("FULL PIPELINE TESTING SCRIPT (AUTH + PDF + JOBS + FAVORITES + CHAT)")
    
    # Get PDF path from command line or ask user
    if len(sys.argv) > 1:
        pdf_path = sys.argv[1]
    else:
        pdf_path = input("📄 Enter path to PDF file: ").strip()
        if not pdf_path:
            print("❌ PDF path is required!")
            return
    
    # Step 0: Register & login to get token
    token = test_register_and_login()
    if not token:
        print("❌ Could not obtain access token, aborting test")
        return

    # Step 1: Test PDF upload (authenticated so data is saved to DB)
    pdf_result = test_pdf_upload(pdf_path, token)
    
    if not pdf_result:
        print("\n❌ PDF upload failed. Cannot continue with job scraping.")
        return
    
    # Wait a bit for database to be updated
    print("\n⏳ Waiting 2 seconds for database to update...")
    time.sleep(2)
    
    # Step 2: Test job scraping
    city = input("\n📍 Enter city for job search (e.g., 'New York', 'London'): ").strip()
    if not city:
        print("❌ City is required!")
        return
    
    max_pages_input = input("📄 Number of pages to scrape (default: 1, max: 3): ").strip()
    try:
        max_pages = min(int(max_pages_input) if max_pages_input else 1, 3)
    except ValueError:
        max_pages = 1
    
    jobs_result = test_job_scraping(city, max_pages)

    # Step 3: Favorites
    favorites_result = None
    if jobs_result:
        favorites_result = test_favorites(jobs_result, token)

    # Step 4: Career chat
    chat_answer = test_career_chat(token) if token else None

    # Save results
    if pdf_result and jobs_result:
        save_results(pdf_result, jobs_result, favorites_result, chat_answer)
    
    # Summary
    print_section("TEST SUMMARY")
    if pdf_result:
        print("✅ PDF Upload & Extraction: SUCCESS")
    else:
        print("❌ PDF Upload & Extraction: FAILED")
    
    if jobs_result:
        print("✅ Job Scraping: SUCCESS")
    else:
        print("❌ Job Scraping: FAILED")

    if favorites_result:
        print("✅ Favorites: SUCCESS")
    else:
        print("⚠️  Favorites: SKIPPED/FAILED")

    if chat_answer:
        print("✅ Career Chat: SUCCESS")
    else:
        print("⚠️  Career Chat: SKIPPED/FAILED")
    
    print("\n" + "=" * 80)
    print("Testing completed!")
    print("=" * 80 + "\n")


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n⚠️  Test interrupted by user.")
    except Exception as e:
        print(f"\n\n❌ Unexpected error: {str(e)}")
        import traceback
        traceback.print_exc()
