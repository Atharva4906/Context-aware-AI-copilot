import os
from dotenv import load_dotenv
from database.supabase_client import get_supabase_client
import json

load_dotenv()
supabase = get_supabase_client()

QUESTIONS = [
    {
        "category": "Math",
        "content": "A rectangle has a perimeter of 24 units. If the length is twice the width, what is the area of the rectangle?",
        "options": ["32", "24", "16", "20"]
    },
    {
        "category": "Math",
        "content": "Simplify the expression: (x^2 * x^3) / x^4",
        "options": ["x^5", "x^2", "x", "x^0"]
    },
    {
        "category": "Physics",
        "content": "A car accelerates uniformly from rest to a speed of 20 m/s in 5 seconds. What is the distance traveled during this time?",
        "options": ["100 m", "50 m", "25 m", "10 m"]
    },
    {
        "category": "Physics",
        "content": "If you drop a feather and a bowling ball simultaneously in a perfect vacuum tube from the same height, which one hits the ground first?",
        "options": ["The bowling ball", "The feather", "They hit at the same time", "It depends on the height"]
    },
    {
        "category": "English",
        "content": "Choose the sentence with the correct subject-verb agreement: A) The group of students are studying for the exam. B) The group of students is studying for the exam.",
        "options": ["A", "B"]
    },
    {
        "category": "English",
        "content": "Identify the dangling modifier: 'Walking down the street, the trees were beautiful.' Why is this incorrect?",
        "options": ["Trees cannot walk.", "'Walking' is misspelled.", "It needs a comma after trees.", "There is no dangling modifier."]
    },
    {
        "category": "Coding",
        "content": "What is the output of the following Python code? \n\ndef add_item(item, item_list=[]):\n    item_list.append(item)\n    return item_list\n\nprint(add_item(1))\nprint(add_item(2))",
        "options": ["[1] then [2]", "[1] then [1, 2]", "[1] then Error", "Error then Error"]
    },
    {
        "category": "Coding",
        "content": "In JavaScript, what is the difference between == and ===?",
        "options": ["== checks value and type, === checks only value", "== checks only value, === checks value and type", "They do the exact same thing", "== is for strings, === is for numbers"]
    }
]

def seed_database():
    print("Beginning Database Seeding...")
    try:
        # Check if table has data to avoid duplicates (naive check)
        res = supabase.table('questions').select('id').limit(1).execute()
        if res.data and len(res.data) > 0:
            print("Questions table already populated. Skipping insert...")
            return
            
        for q in QUESTIONS:
            supabase.table('questions').insert({
                'category': q['category'],
                'content': q['content'],
                'options': q['options']
            }).execute()
            print(f"Inserted: {q['category']} - {q['content'][:30]}...")
            
        print("Successfully seeded questions table!")
    except Exception as e:
        print(f"Error seeding database: {e}")

if __name__ == "__main__":
    seed_database()
