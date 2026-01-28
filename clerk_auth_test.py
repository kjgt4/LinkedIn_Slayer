#!/usr/bin/env python3

import requests
import json
import sys
from datetime import datetime

class ClerkAuthenticationTester:
    def __init__(self, base_url="https://webappbuilder-5.preview.emergentagent.com"):
        self.base_url = base_url
        self.tests_run = 0
        self.tests_passed = 0
        self.session = requests.Session()
        self.session.headers.update({'Content-Type': 'application/json'})

    def log_test(self, name, success, details=""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name} - PASSED")
        else:
            print(f"❌ {name} - FAILED: {details}")
        return success

    def test_api_root_version(self):
        """Test API root endpoint returns version 4.0.0"""
        try:
            response = self.session.get(f"{self.base_url}/api/")
            success = response.status_code == 200
            if success:
                data = response.json()
                # Check if version is 4.0.0 as specified in requirements
                version = data.get("version", "")
                success = version == "4.0.0"
                if not success:
                    return self.log_test("API Root Version 4.0.0", False, f"Expected version 4.0.0, got {version}")
            return self.log_test("API Root Version 4.0.0", success, f"Status: {response.status_code}")
        except Exception as e:
            return self.log_test("API Root Version 4.0.0", False, str(e))

    def test_backend_health_check(self):
        """Test backend health check endpoint"""
        try:
            # Try common health check endpoints
            health_endpoints = ["/health", "/api/health", "/healthz", "/api/healthz"]
            
            for endpoint in health_endpoints:
                try:
                    response = self.session.get(f"{self.base_url}{endpoint}")
                    if response.status_code == 200:
                        return self.log_test("Backend Health Check", True, f"Health endpoint: {endpoint}")
                except:
                    continue
            
            # If no dedicated health endpoint, check if API root is accessible
            response = self.session.get(f"{self.base_url}/api/")
            success = response.status_code == 200
            return self.log_test("Backend Health Check", success, f"Using API root as health check - Status: {response.status_code}")
        except Exception as e:
            return self.log_test("Backend Health Check", False, str(e))

    def test_unauthenticated_posts_401(self):
        """Test that unauthenticated requests to /api/posts return 401"""
        try:
            response = self.session.get(f"{self.base_url}/api/posts")
            success = response.status_code == 401
            if success:
                data = response.json()
                detail = data.get("detail", "").lower()
                success = "authentication required" in detail or "unauthorized" in detail
            return self.log_test("Unauthenticated /api/posts returns 401", success, 
                               f"Status: {response.status_code}, Detail: {response.json().get('detail', '') if response.status_code == 401 else 'Wrong status'}")
        except Exception as e:
            return self.log_test("Unauthenticated /api/posts returns 401", False, str(e))

    def test_unauthenticated_settings_401(self):
        """Test that unauthenticated requests to /api/settings return 401"""
        try:
            response = self.session.get(f"{self.base_url}/api/settings")
            success = response.status_code == 401
            if success:
                data = response.json()
                detail = data.get("detail", "").lower()
                success = "authentication required" in detail or "unauthorized" in detail
            return self.log_test("Unauthenticated /api/settings returns 401", success, 
                               f"Status: {response.status_code}, Detail: {response.json().get('detail', '') if response.status_code == 401 else 'Wrong status'}")
        except Exception as e:
            return self.log_test("Unauthenticated /api/settings returns 401", False, str(e))

    def test_other_protected_endpoints_401(self):
        """Test that other protected endpoints return 401 without auth"""
        protected_endpoints = [
            "/api/auth/me",
            "/api/posts",
            "/api/knowledge", 
            "/api/voice-profiles",
            "/api/analytics/performance"
        ]
        
        passed_count = 0
        for endpoint in protected_endpoints:
            try:
                response = self.session.get(f"{self.base_url}{endpoint}")
                if response.status_code == 401:
                    passed_count += 1
                    print(f"  ✅ {endpoint} correctly returns 401")
                else:
                    print(f"  ❌ {endpoint} returns {response.status_code} instead of 401")
            except Exception as e:
                print(f"  ❌ {endpoint} error: {str(e)}")
        
        success = passed_count == len(protected_endpoints)
        return self.log_test(f"Protected Endpoints Return 401 ({passed_count}/{len(protected_endpoints)})", 
                           success, f"{passed_count} out of {len(protected_endpoints)} endpoints correctly protected")

    def test_public_endpoints_accessible(self):
        """Test that public endpoints are still accessible without auth"""
        public_endpoints = [
            ("/api/", "API root"),
            ("/api/validate-hook", "Hook validation", {"hook": "Test hook"})
        ]
        
        passed_count = 0
        for endpoint_data in public_endpoints:
            endpoint = endpoint_data[0]
            name = endpoint_data[1]
            data = endpoint_data[2] if len(endpoint_data) > 2 else None
            
            try:
                if data:
                    response = self.session.post(f"{self.base_url}{endpoint}", json=data)
                else:
                    response = self.session.get(f"{self.base_url}{endpoint}")
                
                if response.status_code in [200, 201]:
                    passed_count += 1
                    print(f"  ✅ {name} ({endpoint}) accessible - Status: {response.status_code}")
                else:
                    print(f"  ❌ {name} ({endpoint}) returns {response.status_code}")
            except Exception as e:
                print(f"  ❌ {name} ({endpoint}) error: {str(e)}")
        
        success = passed_count == len(public_endpoints)
        return self.log_test(f"Public Endpoints Accessible ({passed_count}/{len(public_endpoints)})", 
                           success, f"{passed_count} out of {len(public_endpoints)} endpoints accessible")

    def run_auth_tests(self):
        """Run all Clerk authentication tests"""
        print("🔐 Starting Clerk Authentication Tests")
        print(f"📡 Testing against: {self.base_url}")
        print("=" * 60)

        # Test API version and health
        self.test_api_root_version()
        self.test_backend_health_check()
        
        # Test authentication requirements
        print("\n🚫 Testing Authentication Requirements...")
        self.test_unauthenticated_posts_401()
        self.test_unauthenticated_settings_401()
        self.test_other_protected_endpoints_401()
        
        # Test public endpoints still work
        print("\n🌐 Testing Public Endpoints...")
        self.test_public_endpoints_accessible()
        
        # Results
        print("\n" + "=" * 60)
        print(f"📊 Authentication Test Results: {self.tests_passed}/{self.tests_run} passed")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All authentication tests passed!")
            return 0
        else:
            print(f"⚠️  {self.tests_run - self.tests_passed} authentication tests failed")
            return 1

def main():
    tester = ClerkAuthenticationTester()
    return tester.run_auth_tests()

if __name__ == "__main__":
    sys.exit(main())