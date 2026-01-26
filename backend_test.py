#!/usr/bin/env python3

import requests
import json
import sys
from datetime import datetime
import uuid

class LinkedInAuthorityEngineAPITester:
    def __init__(self, base_url="https://webappbuilder-5.preview.emergentagent.com"):
        self.base_url = base_url
        self.tests_run = 0
        self.tests_passed = 0
        self.test_post_id = None
        self.test_knowledge_id = None
        self.test_voice_profile_id = None
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

    def test_api_root(self):
        """Test root API endpoint"""
        try:
            response = self.session.get(f"{self.base_url}/api/")
            success = response.status_code == 200
            if success:
                data = response.json()
                success = "LinkedIn Authority Engine API" in data.get("message", "")
            return self.log_test("API Root", success, f"Status: {response.status_code}")
        except Exception as e:
            return self.log_test("API Root", False, str(e))

    def test_get_settings(self):
        """Test getting user settings"""
        try:
            response = self.session.get(f"{self.base_url}/api/settings")
            success = response.status_code == 200
            if success:
                data = response.json()
                required_fields = ['ai_provider', 'ai_model', 'use_emergent_key']
                success = all(field in data for field in required_fields)
            return self.log_test("Get Settings", success, f"Status: {response.status_code}")
        except Exception as e:
            return self.log_test("Get Settings", False, str(e))

    def test_update_settings(self):
        """Test updating user settings"""
        try:
            update_data = {
                "ai_provider": "anthropic",
                "ai_model": "claude-sonnet-4-5-20250929",
                "use_emergent_key": True
            }
            response = self.session.put(f"{self.base_url}/api/settings", json=update_data)
            success = response.status_code == 200
            if success:
                data = response.json()
                success = data.get("ai_provider") == "anthropic"
            return self.log_test("Update Settings", success, f"Status: {response.status_code}")
        except Exception as e:
            return self.log_test("Update Settings", False, str(e))

    def test_create_post(self):
        """Test creating a new post"""
        try:
            post_data = {
                "title": "Test LinkedIn Post",
                "hook": "How I grew my LinkedIn following",
                "rehook": "From 100 to 10,000 followers in 6 months",
                "content": "This is test content for the LinkedIn post",
                "framework": "slay",
                "pillar": "growth",
                "status": "draft"
            }
            response = self.session.post(f"{self.base_url}/api/posts", json=post_data)
            success = response.status_code == 200
            if success:
                data = response.json()
                self.test_post_id = data.get("id")
                success = self.test_post_id is not None
            return self.log_test("Create Post", success, f"Status: {response.status_code}")
        except Exception as e:
            return self.log_test("Create Post", False, str(e))

    def test_get_posts(self):
        """Test getting all posts"""
        try:
            response = self.session.get(f"{self.base_url}/api/posts")
            success = response.status_code == 200
            if success:
                data = response.json()
                success = isinstance(data, list)
            return self.log_test("Get Posts", success, f"Status: {response.status_code}")
        except Exception as e:
            return self.log_test("Get Posts", False, str(e))

    def test_get_post_by_id(self):
        """Test getting a specific post by ID"""
        if not self.test_post_id:
            return self.log_test("Get Post by ID", False, "No test post ID available")
        
        try:
            response = self.session.get(f"{self.base_url}/api/posts/{self.test_post_id}")
            success = response.status_code == 200
            if success:
                data = response.json()
                success = data.get("id") == self.test_post_id
            return self.log_test("Get Post by ID", success, f"Status: {response.status_code}")
        except Exception as e:
            return self.log_test("Get Post by ID", False, str(e))

    def test_update_post(self):
        """Test updating a post"""
        if not self.test_post_id:
            return self.log_test("Update Post", False, "No test post ID available")
        
        try:
            update_data = {
                "title": "Updated Test Post",
                "content": "Updated content for the test post"
            }
            response = self.session.put(f"{self.base_url}/api/posts/{self.test_post_id}", json=update_data)
            success = response.status_code == 200
            if success:
                data = response.json()
                success = data.get("title") == "Updated Test Post"
            return self.log_test("Update Post", success, f"Status: {response.status_code}")
        except Exception as e:
            return self.log_test("Update Post", False, str(e))

    def test_validate_hook(self):
        """Test hook validation endpoint"""
        try:
            hook_data = {"hook": "How I grew my business"}
            response = self.session.post(f"{self.base_url}/api/validate-hook", json=hook_data)
            success = response.status_code == 200
            if success:
                data = response.json()
                required_fields = ['is_valid', 'word_count', 'suggestions', 'score']
                success = all(field in data for field in required_fields)
            return self.log_test("Validate Hook", success, f"Status: {response.status_code}")
        except Exception as e:
            return self.log_test("Validate Hook", False, str(e))

    def test_calendar_week(self):
        """Test weekly calendar endpoint"""
        try:
            response = self.session.get(f"{self.base_url}/api/calendar/week")
            success = response.status_code == 200
            if success:
                data = response.json()
                required_fields = ['week_start', 'week_end', 'days']
                success = all(field in data for field in required_fields)
                if success:
                    success = len(data['days']) == 7  # Should have 7 days
            return self.log_test("Calendar Week", success, f"Status: {response.status_code}")
        except Exception as e:
            return self.log_test("Calendar Week", False, str(e))

    def test_ai_generate_content(self):
        """Test AI content generation"""
        try:
            content_data = {
                "topic": "LinkedIn growth strategies",
                "framework": "slay",
                "pillar": "growth"
            }
            response = self.session.post(f"{self.base_url}/api/ai/generate-content", json=content_data)
            success = response.status_code == 200
            if success:
                data = response.json()
                success = 'content' in data and len(data['content']) > 0
            return self.log_test("AI Generate Content", success, f"Status: {response.status_code}")
        except Exception as e:
            return self.log_test("AI Generate Content", False, str(e))

    def test_ai_suggest_topics(self):
        """Test AI topic suggestions"""
        try:
            response = self.session.post(f"{self.base_url}/api/ai/suggest-topics")
            success = response.status_code == 200
            if success:
                data = response.json()
                success = isinstance(data, list) and len(data) > 0
                if success and len(data) > 0:
                    # Check first suggestion has required fields
                    first_suggestion = data[0]
                    required_fields = ['topic', 'pillar', 'framework', 'angle']
                    success = all(field in first_suggestion for field in required_fields)
            return self.log_test("AI Suggest Topics", success, f"Status: {response.status_code}")
        except Exception as e:
            return self.log_test("AI Suggest Topics", False, str(e))

    def test_ai_improve_hook(self):
        """Test AI hook improvement"""
        try:
            hook_data = {"hook": "How to grow your business"}
            response = self.session.post(f"{self.base_url}/api/ai/improve-hook", json=hook_data)
            success = response.status_code == 200
            if success:
                data = response.json()
                success = 'suggestions' in data and len(data['suggestions']) > 0
            return self.log_test("AI Improve Hook", success, f"Status: {response.status_code}")
        except Exception as e:
            return self.log_test("AI Improve Hook", False, str(e))

    # ============== Phase 3 Features Tests ==============
    
    def test_get_voice_profiles(self):
        """Test getting all voice profiles"""
        try:
            response = self.session.get(f"{self.base_url}/api/voice-profiles")
            success = response.status_code == 200
            if success:
                data = response.json()
                success = isinstance(data, list)
            return self.log_test("Get Voice Profiles", success, f"Status: {response.status_code}")
        except Exception as e:
            return self.log_test("Get Voice Profiles", False, str(e))

    def test_create_voice_profile(self):
        """Test creating a voice profile"""
        try:
            profile_data = {
                "name": "Test Voice Profile",
                "tone": "professional",
                "vocabulary_style": "business",
                "sentence_structure": "varied",
                "personality_traits": ["confident", "helpful"],
                "preferred_phrases": ["Here's the thing", "Let me share"],
                "signature_expressions": ["In my experience"],
                "industry_context": "B2B SaaS",
                "target_audience": "CTOs and Tech Leaders"
            }
            response = self.session.post(f"{self.base_url}/api/voice-profiles", json=profile_data)
            success = response.status_code == 200
            if success:
                data = response.json()
                self.test_voice_profile_id = data.get("id")
                success = self.test_voice_profile_id is not None
            return self.log_test("Create Voice Profile", success, f"Status: {response.status_code}")
        except Exception as e:
            return self.log_test("Create Voice Profile", False, str(e))

    def test_get_voice_profile_by_id(self):
        """Test getting a specific voice profile by ID"""
        if not hasattr(self, 'test_voice_profile_id') or not self.test_voice_profile_id:
            return self.log_test("Get Voice Profile by ID", False, "No test voice profile ID available")
        
        try:
            response = self.session.get(f"{self.base_url}/api/voice-profiles/{self.test_voice_profile_id}")
            success = response.status_code == 200
            if success:
                data = response.json()
                success = data.get("id") == self.test_voice_profile_id
            return self.log_test("Get Voice Profile by ID", success, f"Status: {response.status_code}")
        except Exception as e:
            return self.log_test("Get Voice Profile by ID", False, str(e))

    def test_activate_voice_profile(self):
        """Test activating a voice profile"""
        if not hasattr(self, 'test_voice_profile_id') or not self.test_voice_profile_id:
            return self.log_test("Activate Voice Profile", False, "No test voice profile ID available")
        
        try:
            response = self.session.post(f"{self.base_url}/api/voice-profiles/{self.test_voice_profile_id}/activate")
            success = response.status_code == 200
            if success:
                data = response.json()
                success = data.get("is_active") == True
            return self.log_test("Activate Voice Profile", success, f"Status: {response.status_code}")
        except Exception as e:
            return self.log_test("Activate Voice Profile", False, str(e))

    def test_get_active_voice_profile(self):
        """Test getting the active voice profile"""
        try:
            response = self.session.get(f"{self.base_url}/api/voice-profiles/active")
            success = response.status_code == 200
            if success:
                data = response.json()
                # Can be null if no active profile, so just check it's a valid response
                success = data is None or isinstance(data, dict)
            return self.log_test("Get Active Voice Profile", success, f"Status: {response.status_code}")
        except Exception as e:
            return self.log_test("Get Active Voice Profile", False, str(e))

    def test_analyze_writing_samples(self):
        """Test analyzing writing samples to create voice profile"""
        try:
            samples = [
                "Here's the thing about LinkedIn growth - it's not about posting more, it's about posting better. I learned this the hard way after 6 months of daily posts with zero engagement.",
                "Let me share something that changed my perspective on content creation. The best posts aren't the ones with perfect grammar or fancy words. They're the ones that solve real problems for real people.",
                "In my experience working with 100+ B2B companies, the biggest mistake I see is focusing on features instead of outcomes. Your audience doesn't care about your product specs - they care about results."
            ]
            response = self.session.post(f"{self.base_url}/api/voice-profiles/analyze-samples", json=samples)
            success = response.status_code == 200
            if success:
                data = response.json()
                # Should return analysis with tone, style, etc.
                success = 'tone' in data or 'recommended_profile_name' in data
            return self.log_test("Analyze Writing Samples", success, f"Status: {response.status_code}")
        except Exception as e:
            return self.log_test("Analyze Writing Samples", False, str(e))

    def test_linkedin_auth_url(self):
        """Test getting LinkedIn OAuth URL"""
        try:
            response = self.session.get(f"{self.base_url}/api/linkedin/auth")
            # This should return 400 if LinkedIn credentials not configured (expected)
            # or 200 if configured
            success = response.status_code in [200, 400]
            if response.status_code == 400:
                # Check if it's the expected "not configured" error
                data = response.json()
                success = "not configured" in data.get("detail", "").lower()
            elif response.status_code == 200:
                data = response.json()
                success = "auth_url" in data
            return self.log_test("LinkedIn Auth URL", success, f"Status: {response.status_code}")
        except Exception as e:
            return self.log_test("LinkedIn Auth URL", False, str(e))

    def test_linkedin_disconnect(self):
        """Test LinkedIn disconnect endpoint"""
        try:
            response = self.session.post(f"{self.base_url}/api/linkedin/disconnect")
            success = response.status_code == 200
            if success:
                data = response.json()
                success = "disconnected successfully" in data.get("message", "").lower()
            return self.log_test("LinkedIn Disconnect", success, f"Status: {response.status_code}")
        except Exception as e:
            return self.log_test("LinkedIn Disconnect", False, str(e))

    def test_delete_voice_profile(self):
        """Test deleting a voice profile"""
        if not hasattr(self, 'test_voice_profile_id') or not self.test_voice_profile_id:
            return self.log_test("Delete Voice Profile", False, "No test voice profile ID available")
        
        try:
            response = self.session.delete(f"{self.base_url}/api/voice-profiles/{self.test_voice_profile_id}")
            success = response.status_code == 200
            if success:
                data = response.json()
                success = "deleted successfully" in data.get("message", "")
            return self.log_test("Delete Voice Profile", success, f"Status: {response.status_code}")
        except Exception as e:
            return self.log_test("Delete Voice Profile", False, str(e))

    # ============== Phase 2 Features Tests ==============
    
    def test_schedule_post(self):
        """Test scheduling a post"""
        if not self.test_post_id:
            return self.log_test("Schedule Post", False, "No test post ID available")
        
        try:
            schedule_data = {
                "scheduled_date": "2025-01-15",
                "scheduled_slot": 1,
                "scheduled_time": "10:00"
            }
            response = self.session.post(f"{self.base_url}/api/posts/{self.test_post_id}/schedule", 
                                       params=schedule_data)
            success = response.status_code == 200
            if success:
                data = response.json()
                success = data.get("status") == "scheduled"
            return self.log_test("Schedule Post", success, f"Status: {response.status_code}")
        except Exception as e:
            return self.log_test("Schedule Post", False, str(e))

    def test_publish_post(self):
        """Test publishing a post"""
        if not self.test_post_id:
            return self.log_test("Publish Post", False, "No test post ID available")
        
        try:
            response = self.session.post(f"{self.base_url}/api/posts/{self.test_post_id}/publish")
            success = response.status_code == 200
            if success:
                data = response.json()
                success = data.get("status") == "published"
            return self.log_test("Publish Post", success, f"Status: {response.status_code}")
        except Exception as e:
            return self.log_test("Publish Post", False, str(e))

    def test_engagement_active(self):
        """Test getting active engagement posts"""
        try:
            response = self.session.get(f"{self.base_url}/api/engagement/active")
            success = response.status_code == 200
            if success:
                data = response.json()
                success = isinstance(data, list)
            return self.log_test("Active Engagement", success, f"Status: {response.status_code}")
        except Exception as e:
            return self.log_test("Active Engagement", False, str(e))

    def test_create_knowledge_item(self):
        """Test creating a knowledge vault item"""
        try:
            knowledge_data = {
                "title": "Test Knowledge Item",
                "content": "This is test content for knowledge vault",
                "source_type": "text",
                "tags": ["test", "knowledge"]
            }
            response = self.session.post(f"{self.base_url}/api/knowledge", json=knowledge_data)
            success = response.status_code == 200
            if success:
                data = response.json()
                self.test_knowledge_id = data.get("id")
                success = self.test_knowledge_id is not None
            return self.log_test("Create Knowledge Item", success, f"Status: {response.status_code}")
        except Exception as e:
            return self.log_test("Create Knowledge Item", False, str(e))

    def test_get_knowledge_items(self):
        """Test getting all knowledge items"""
        try:
            response = self.session.get(f"{self.base_url}/api/knowledge")
            success = response.status_code == 200
            if success:
                data = response.json()
                success = isinstance(data, list)
            return self.log_test("Get Knowledge Items", success, f"Status: {response.status_code}")
        except Exception as e:
            return self.log_test("Get Knowledge Items", False, str(e))

    def test_get_knowledge_item_by_id(self):
        """Test getting a specific knowledge item by ID"""
        if not hasattr(self, 'test_knowledge_id') or not self.test_knowledge_id:
            return self.log_test("Get Knowledge Item by ID", False, "No test knowledge ID available")
        
        try:
            response = self.session.get(f"{self.base_url}/api/knowledge/{self.test_knowledge_id}")
            success = response.status_code == 200
            if success:
                data = response.json()
                success = data.get("id") == self.test_knowledge_id
            return self.log_test("Get Knowledge Item by ID", success, f"Status: {response.status_code}")
        except Exception as e:
            return self.log_test("Get Knowledge Item by ID", False, str(e))

    def test_add_knowledge_from_url(self):
        """Test adding knowledge from URL"""
        try:
            url_data = {
                "url": "https://example.com",
                "title": "Test URL Knowledge",
                "tags": ["url", "test"]
            }
            response = self.session.post(f"{self.base_url}/api/knowledge/url", params=url_data)
            success = response.status_code == 200
            if success:
                data = response.json()
                success = data.get("source_type") == "url"
            return self.log_test("Add Knowledge from URL", success, f"Status: {response.status_code}")
        except Exception as e:
            return self.log_test("Add Knowledge from URL", False, str(e))

    def test_extract_gems(self):
        """Test extracting gems from knowledge item"""
        if not hasattr(self, 'test_knowledge_id') or not self.test_knowledge_id:
            return self.log_test("Extract Gems", False, "No test knowledge ID available")
        
        try:
            response = self.session.post(f"{self.base_url}/api/knowledge/{self.test_knowledge_id}/extract-gems")
            success = response.status_code == 200
            if success:
                data = response.json()
                success = 'gems' in data
            return self.log_test("Extract Gems", success, f"Status: {response.status_code}")
        except Exception as e:
            return self.log_test("Extract Gems", False, str(e))

    def test_performance_metrics(self):
        """Test getting performance analytics"""
        try:
            response = self.session.get(f"{self.base_url}/api/analytics/performance")
            success = response.status_code == 200
            if success:
                data = response.json()
                required_fields = ['total_posts', 'published_posts', 'avg_engagement', 
                                 'pillar_performance', 'framework_performance']
                success = all(field in data for field in required_fields)
            return self.log_test("Performance Metrics", success, f"Status: {response.status_code}")
        except Exception as e:
            return self.log_test("Performance Metrics", False, str(e))

    def test_pillar_recommendation(self):
        """Test getting AI pillar recommendation"""
        try:
            response = self.session.get(f"{self.base_url}/api/analytics/pillar-recommendation")
            success = response.status_code == 200
            if success:
                data = response.json()
                required_fields = ['recommendation', 'suggested_distribution', 'insight']
                success = all(field in data for field in required_fields)
            return self.log_test("Pillar Recommendation", success, f"Status: {response.status_code}")
        except Exception as e:
            return self.log_test("Pillar Recommendation", False, str(e))

    def test_delete_knowledge_item(self):
        """Test deleting a knowledge item"""
        if not hasattr(self, 'test_knowledge_id') or not self.test_knowledge_id:
            return self.log_test("Delete Knowledge Item", False, "No test knowledge ID available")
        
        try:
            response = self.session.delete(f"{self.base_url}/api/knowledge/{self.test_knowledge_id}")
            success = response.status_code == 200
            if success:
                data = response.json()
                success = "deleted successfully" in data.get("message", "")
            return self.log_test("Delete Knowledge Item", success, f"Status: {response.status_code}")
        except Exception as e:
            return self.log_test("Delete Knowledge Item", False, str(e))

    def test_delete_post(self):
        """Test deleting a post (run last)"""
        if not self.test_post_id:
            return self.log_test("Delete Post", False, "No test post ID available")
        
        try:
            response = self.session.delete(f"{self.base_url}/api/posts/{self.test_post_id}")
            success = response.status_code == 200
            if success:
                data = response.json()
                success = "deleted successfully" in data.get("message", "")
            return self.log_test("Delete Post", success, f"Status: {response.status_code}")
        except Exception as e:
            return self.log_test("Delete Post", False, str(e))

    def run_all_tests(self):
        """Run all API tests in sequence"""
        print("🚀 Starting LinkedIn Authority Engine API Tests")
        print(f"📡 Testing against: {self.base_url}")
        print("=" * 60)

        # Basic API tests
        self.test_api_root()
        
        # Settings tests
        self.test_get_settings()
        self.test_update_settings()
        
        # Post CRUD tests
        self.test_create_post()
        self.test_get_posts()
        self.test_get_post_by_id()
        self.test_update_post()
        
        # Utility endpoints
        self.test_validate_hook()
        self.test_calendar_week()
        
        # AI endpoints (may take longer)
        print("\n🤖 Testing AI endpoints (may take a few seconds)...")
        self.test_ai_generate_content()
        self.test_ai_suggest_topics()
        self.test_ai_improve_hook()
        
        # Phase 2 Features - Knowledge Vault
        print("\n📚 Testing Knowledge Vault endpoints...")
        self.test_create_knowledge_item()
        self.test_get_knowledge_items()
        self.test_get_knowledge_item_by_id()
        self.test_add_knowledge_from_url()
        self.test_extract_gems()
        
        # Phase 2 Features - Analytics
        print("\n📊 Testing Analytics endpoints...")
        self.test_performance_metrics()
        self.test_pillar_recommendation()
        
        # Phase 2 Features - Scheduling & Publishing
        print("\n📅 Testing Scheduling & Publishing endpoints...")
        self.test_schedule_post()
        self.test_publish_post()
        self.test_engagement_active()
        
        # Phase 3 Features - Voice Profiles
        print("\n🎤 Testing Voice Profile endpoints...")
        self.test_get_voice_profiles()
        self.test_create_voice_profile()
        self.test_get_voice_profile_by_id()
        self.test_activate_voice_profile()
        self.test_get_active_voice_profile()
        self.test_analyze_writing_samples()
        
        # Phase 3 Features - LinkedIn Integration
        print("\n🔗 Testing LinkedIn Integration endpoints...")
        self.test_linkedin_auth_url()
        self.test_linkedin_disconnect()
        
        # Cleanup
        print("\n🧹 Cleaning up test data...")
        self.test_delete_knowledge_item()
        self.test_delete_voice_profile()
        self.test_delete_post()
        
        # Results
        print("\n" + "=" * 60)
        print(f"📊 Test Results: {self.tests_passed}/{self.tests_run} passed")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All tests passed!")
            return 0
        else:
            print(f"⚠️  {self.tests_run - self.tests_passed} tests failed")
            return 1

def main():
    tester = LinkedInAuthorityEngineAPITester()
    return tester.run_all_tests()

if __name__ == "__main__":
    sys.exit(main())