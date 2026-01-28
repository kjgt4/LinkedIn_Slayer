#!/usr/bin/env python3
"""
Strategic Engagement Hub Backend API Testing
Tests all engagement hub endpoints for authentication and functionality
"""

import requests
import sys
import json
from datetime import datetime

class EngagementHubAPITester:
    def __init__(self, base_url="https://webappbuilder-5.preview.emergentagent.com"):
        self.base_url = base_url
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        if headers:
            test_headers.update(headers)

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        print(f"   Method: {method}")
        print(f"   Expected Status: {expected_status}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers, timeout=10)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=test_headers, timeout=10)
            elif method == 'DELETE':
                response = requests.delete(url, headers=test_headers, timeout=10)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ PASSED - Status: {response.status_code}")
                if response.text:
                    try:
                        resp_json = response.json()
                        if isinstance(resp_json, dict) and 'detail' in resp_json:
                            print(f"   Response: {resp_json['detail']}")
                    except:
                        print(f"   Response: {response.text[:100]}...")
            else:
                print(f"❌ FAILED - Expected {expected_status}, got {response.status_code}")
                print(f"   Response: {response.text[:200]}...")
                self.failed_tests.append({
                    'name': name,
                    'expected': expected_status,
                    'actual': response.status_code,
                    'response': response.text[:200]
                })

            return success, response

        except Exception as e:
            print(f"❌ FAILED - Error: {str(e)}")
            self.failed_tests.append({
                'name': name,
                'error': str(e)
            })
            return False, None

    def test_engagement_hub_endpoints(self):
        """Test all Strategic Engagement Hub endpoints for authentication"""
        
        print("=" * 60)
        print("STRATEGIC ENGAGEMENT HUB API TESTING")
        print("=" * 60)
        print("Testing all engagement hub endpoints require authentication (401)")
        
        # Test Influencers endpoints
        print("\n📋 TESTING INFLUENCERS ENDPOINTS")
        self.run_test("Get Influencers (No Auth)", "GET", "api/influencers", 401)
        self.run_test("Get Single Influencer (No Auth)", "GET", "api/influencers/test-id", 401)
        self.run_test("Create Influencer (No Auth)", "POST", "api/influencers", 401, {
            "name": "Test Influencer",
            "linkedin_url": "https://linkedin.com/in/test"
        })
        self.run_test("Update Influencer (No Auth)", "PUT", "api/influencers/test-id", 401, {
            "name": "Updated Name"
        })
        self.run_test("Delete Influencer (No Auth)", "DELETE", "api/influencers/test-id", 401)
        
        # Test Tracked Posts endpoints
        print("\n📝 TESTING TRACKED POSTS ENDPOINTS")
        self.run_test("Get Tracked Posts (No Auth)", "GET", "api/tracked-posts", 401)
        self.run_test("Get Engagement Queue (No Auth)", "GET", "api/tracked-posts/queue", 401)
        self.run_test("Get Single Tracked Post (No Auth)", "GET", "api/tracked-posts/test-id", 401)
        self.run_test("Create Tracked Post (No Auth)", "POST", "api/tracked-posts", 401, {
            "influencer_id": "test-id",
            "linkedin_post_url": "https://linkedin.com/posts/test",
            "post_content": "Test post content"
        })
        self.run_test("Update Tracked Post (No Auth)", "PUT", "api/tracked-posts/test-id", 401, {
            "status": "engaged"
        })
        self.run_test("Delete Tracked Post (No Auth)", "DELETE", "api/tracked-posts/test-id", 401)
        self.run_test("Mark Post Engaged (No Auth)", "POST", "api/tracked-posts/test-id/mark-engaged", 401, {
            "engagement_type": "like"
        })
        
        # Test AI endpoints
        print("\n🤖 TESTING AI ENDPOINTS")
        self.run_test("Draft Engagement Comment (No Auth)", "POST", "api/ai/draft-engagement-comment", 401, {
            "influencer_id": "test-id",
            "post_content": "Test content",
            "post_url": "https://linkedin.com/posts/test"
        })
        self.run_test("Suggest Influencer Search (No Auth)", "POST", "api/ai/suggest-influencer-search", 401, {
            "user_content_pillars": ["Growth", "TAM", "Sales"],
            "user_industry": "B2B SaaS"
        })
        
        # Test Analytics endpoints
        print("\n📊 TESTING ANALYTICS ENDPOINTS")
        self.run_test("Get Engagement Analytics (No Auth)", "GET", "api/analytics/engagement", 401)
        
        # Test some existing endpoints to ensure they still work
        print("\n🔍 TESTING EXISTING ENDPOINTS (Should still work)")
        self.run_test("API Root (Public)", "GET", "api/", 200)
        self.run_test("Hook Validation (Public)", "POST", "api/validate-hook", 200, {
            "hook": "How I increased sales by 300%"
        })
        
        # Test protected existing endpoints
        print("\n🔒 TESTING EXISTING PROTECTED ENDPOINTS")
        self.run_test("Get Posts (No Auth)", "GET", "api/posts", 401)
        self.run_test("Get Settings (No Auth)", "GET", "api/settings", 401)
        self.run_test("Get Auth Me (No Auth)", "GET", "api/auth/me", 401)

    def print_summary(self):
        """Print test summary"""
        print("\n" + "=" * 60)
        print("TEST SUMMARY")
        print("=" * 60)
        print(f"📊 Tests Run: {self.tests_run}")
        print(f"✅ Tests Passed: {self.tests_passed}")
        print(f"❌ Tests Failed: {len(self.failed_tests)}")
        print(f"📈 Success Rate: {(self.tests_passed/self.tests_run*100):.1f}%")
        
        if self.failed_tests:
            print("\n❌ FAILED TESTS:")
            for i, test in enumerate(self.failed_tests, 1):
                print(f"{i}. {test['name']}")
                if 'error' in test:
                    print(f"   Error: {test['error']}")
                else:
                    print(f"   Expected: {test['expected']}, Got: {test['actual']}")
                    if 'response' in test:
                        print(f"   Response: {test['response']}")
        
        return len(self.failed_tests) == 0

def main():
    """Main test execution"""
    print("Strategic Engagement Hub Backend API Testing")
    print(f"Timestamp: {datetime.now().isoformat()}")
    
    tester = EngagementHubAPITester()
    
    # Run all tests
    tester.test_engagement_hub_endpoints()
    
    # Print summary and return exit code
    success = tester.print_summary()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())