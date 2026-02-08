import ollama
import csv
import json
import time
from pathlib import Path
from tqdm import tqdm
import threading

# =============================================================================
# CONFIGURATION - EDIT THESE VALUES
# =============================================================================

INPUT_CSV = 'customer_support_tickets.csv'
OUTPUT_CSV = 'classified_tickets.csv'
TEXT_COLUMN = 'description'
ID_COLUMN = 'id'

MODEL = 'llama3.2'                     # Changed from 'llama3.2:1b' to 'llama3.2'
NUM_WORKERS = 1                        # Reduced from 6 to 1 for 3B model
SAVE_INTERVAL = 250

# Categories for classification
CATEGORIES = [
    "account",
    "billing",
    "bug",
    "deployment",
    "hardware",          # NEW
    "infrastructure",
    "integration",
    "login",
    "network",
    "other",
    "security"
]

PRIORITIES = ["High", "Medium", "Low"]

# =============================================================================
# TICKET CLASSIFIER CLASS
# =============================================================================

class TicketClassifier:
    def __init__(self):
        self.model_name = MODEL
        self.num_workers = NUM_WORKERS
        self.checkpoint_file = 'checkpoint_progress.csv'
        self.lock = threading.Lock()
        
        print("="*70)
        print("🎯 TICKET CLASSIFICATION SYSTEM")
        print("="*70)
        print(f"🤖 Model: {self.model_name} (3B parameters)")
        print(f"⚡ Workers: {self.num_workers}")
        print(f"📂 Input: {INPUT_CSV}")
        print(f"💾 Output: {OUTPUT_CSV}")
        print(f"📊 Categories: {', '.join(CATEGORIES)}")
        print("="*70 + "\n")
    
    def classify_single_ticket(self, description: str, retry_count=2) -> dict:
        """Classify with improved prompt and 3B model"""
        
        # Truncate very long descriptions
        if len(description) > 500:
            description = description[:500] + "..."
        
        prompt = f"""You are a support ticket classifier.
Classify the ticket into EXACTLY ONE category and ONE priority.

CATEGORIES:
{', '.join(CATEGORIES)}

CATEGORY DEFINITIONS:
- hardware: Physical device failures or malfunctions (routers, switches, printers, servers, IoT devices, sensors, cameras, disks, NICs, GPUs)
- network: Connectivity, routing, VPN, DNS, firewall, bandwidth issues
- infrastructure: Cloud platforms, SaaS availability, servers, storage, virtual machines
- integration: Software-to-software compatibility, APIs, third-party tools
- bug: Software defect or incorrect behavior in the product
- billing: Invoices, payments, pricing, charges
- security: Breaches, vulnerabilities, attacks, access compromise
- account/login: User access, authentication, permissions
- other: General questions, planning, documentation, pre-sales

PRIORITY RULES (APPLY STRICTLY):

HIGH PRIORITY:
Assign High if ANY of the following are true:
- Complete or major service outage
- Security breach, cyber attack, compromised systems
- Data loss, sensitive data exposure, compliance risk (HIPAA, GDPR, ISO)
- Network or VPN failure blocking operations
- Hardware failure blocking operations
- Payment failure or issue blocking revenue
- Words indicating urgency: "critical", "urgent", "immediate", "outage", "downtime"

MEDIUM PRIORITY:
Assign Medium if:
- System is partially working but degraded
- Intermittent failures or repeated disruptions
- Intermittent or degraded hardware performance
- Billing discrepancies or incorrect charges
- Feature integration works but data is delayed or incorrect
- Scheduled maintenance, configuration updates, compatibility issues

LOW PRIORITY:
Assign Low if:
- Informational request, inquiry, or comparison
- Asking how a feature works
- Pre-sales, pricing, documentation, demos
- Planning, strategy, or future improvements
- Hardware specifications, replacement questions, or compatibility inquiries

IMPORTANT ESCALATION RULES:
- Security-related issues are ALWAYS High unless purely informational
- Outage + business impact is ALWAYS High
- Hardware failure blocking access is ALWAYS High
- Partial failure without outage is NEVER High
- Questions without failures are ALWAYS Low

FINAL CHECK:
Before answering, double-check that:
1) Outage / Breach / Blocking hardware failure → High
2) Partial failure or degraded service → Medium
3) Question / Information only → Low

EXAMPLES:

Ticket:
"Centralized account management portal is offline and blocking access for all users."
Output:
{{"category": "account", "priority": "High"}}

Ticket:
"Looking for compatibility details with Amazon Alexa, Google Assistant, and Apple HomeKit."
Output:
{{"category": "integration", "priority": "Low"}}

Ticket:
"Need clarification on invoice charges and billing cycle details."
Output:
{{"category": "billing", "priority": "Low"}}

Ticket:
"Asking whether your software integrates with CRM and marketing tools."
Output:
{{"category": "integration", "priority": "Low"}}

Ticket:
"Requesting product feature details, manuals, and demo videos."
Output:
{{"category": "other", "priority": "Low"}}

Ticket:
"Multiple system service disruptions caused by network hardware failures."
Output:
{{"category": "network", "priority": "High"}}

Ticket:
"Printer not working on macOS 15 due to possible driver compatibility issues."
Output:
{{"category": "integration", "priority": "Medium"}}

Ticket:
"VPN-router connectivity failure impacting remote medical systems."
Output:
{{"category": "network", "priority": "High"}}

Ticket:
"Cloud SaaS platform unstable, dashboard not loading and high latency."
Output:
{{"category": "infrastructure", "priority": "High"}}

Ticket:
"Requesting information about agency services, pricing, and case studies."
Output:
{{"category": "other", "priority": "Low"}}

Ticket:
"Office router stopped working and all devices lost connectivity."
Output:
{{"category": "hardware", "priority": "High"}}

Ticket:
"Printer frequently disconnects and fails during large print jobs."
Output:
{{"category": "hardware", "priority": "Medium"}}

Ticket:
"Requesting specifications and supported models for network switches."
Output:
{{"category": "hardware", "priority": "Low"}}

Ticket:
"Smart thermostat device not powering on after firmware update."
Output:
{{"category": "hardware", "priority": "High"}}

NOW CLASSIFY THIS TICKET:
\"{description}\"

Respond with ONLY valid JSON:
{{"category": "...", "priority": "..."}}"""



        for attempt in range(retry_count):
            try:
                response = ollama.chat(
                    model=self.model_name,
                    messages=[{'role': 'user', 'content': prompt}],
                    options={
                        "temperature": 0.2,      # Slightly higher for variety
                        "num_predict": 50,
                        "num_gpu": 99,           # Use all GPU layers
                        "num_thread": 2,         # Fewer CPU threads
                        "num_ctx": 4096,
                        "repeat_penalty": 1.1,   # Avoid repetition
                        "top_k": 40
                    }
                )
                
                content = response['message']['content'].strip()
                
                # Clean markdown formatting
                if '```' in content:
                    parts = content.split('```')
                    for part in parts:
                        if part.strip().startswith('{'):
                            content = part.strip()
                            break
                    if content.startswith('json'):
                        content = content[4:].strip()
                
                content = content.replace('```', '').strip()
                
                # Parse JSON
                result = json.loads(content)
                
                # Validate
                if result.get('category') not in CATEGORIES:
                    result['category'] = 'other'
                    
                if result.get('priority') not in PRIORITIES:
                    result['priority'] = 'Medium'
                
                return result
                
            except Exception as e:
                if attempt == retry_count - 1:
                    return {
                        "category": "other",
                        "priority": "Medium",
                        "error": True
                    }
                time.sleep(0.5)
    
    def load_tickets_from_csv(self) -> list:
        """Load tickets from input CSV file"""
        tickets = []
        
        print(f"📂 Loading tickets from: {INPUT_CSV}")
        
        try:
            with open(INPUT_CSV, 'r', encoding='utf-8') as f:
                reader = csv.DictReader(f)
                
                if TEXT_COLUMN not in reader.fieldnames:
                    print(f"❌ Error: Column '{TEXT_COLUMN}' not found!")
                    print(f"Available columns: {', '.join(reader.fieldnames)}")
                    exit(1)
                
                for idx, row in enumerate(reader):
                    ticket_id = row.get(ID_COLUMN, idx + 1)
                    description = row.get(TEXT_COLUMN, '').strip()
                    
                    if description:
                        tickets.append((idx, ticket_id, description))
            
            print(f"✅ Loaded {len(tickets):,} tickets\n")
            return tickets
            
        except FileNotFoundError:
            print(f"❌ Error: File '{INPUT_CSV}' not found!")
            exit(1)
        except Exception as e:
            print(f"❌ Error loading CSV: {e}")
            exit(1)
    
    def load_checkpoint(self) -> int:
        """Load progress from checkpoint"""
        if Path(self.checkpoint_file).exists():
            try:
                with open(self.checkpoint_file, 'r', encoding='utf-8') as f:
                    reader = csv.DictReader(f)
                    count = sum(1 for _ in reader)
                return count
            except:
                return 0
        return 0
    
    def save_checkpoint(self, results: list):
        """Save progress to checkpoint"""
        with self.lock:
            with open(self.checkpoint_file, 'w', encoding='utf-8', newline='') as f:
                if results:
                    fieldnames = ['id', 'description', 'category', 'priority', 'has_error']
                    writer = csv.DictWriter(f, fieldnames=fieldnames)
                    writer.writeheader()
                    writer.writerows(results)
    
    def classify_all_tickets(self):
        """Main classification function"""
        
        tickets = self.load_tickets_from_csv()
        
        if not tickets:
            print("❌ No tickets to process!")
            return
        
        start_idx = self.load_checkpoint()
        
        if start_idx > 0:
            print(f"📂 Checkpoint: {start_idx:,} tickets processed")
            print(f"📝 Resuming from ticket {start_idx + 1:,}...\n")
            
            with open(self.checkpoint_file, 'r', encoding='utf-8') as f:
                reader = csv.DictReader(f)
                all_results = list(reader)
            
            tickets = tickets[start_idx:]
        else:
            all_results = []
            print(f"🚀 Starting fresh classification\n")
        
        # Updated estimate for 3B model (slower but more accurate)
        estimated_time = len(tickets) / 2.5  # ~2.5 tickets/sec expected
        print(f"⏱️  Estimated: {estimated_time/60:.0f} min ({estimated_time/3600:.1f} hrs)")
        print(f"💾 Saves every {SAVE_INTERVAL} tickets")
        print(f"\n{'='*70}\n")
        
        input("Press ENTER to start... ")
        print()
        
        start_time = time.time()
        error_count = 0
        
        with tqdm(total=len(tickets), 
                 desc="🔄 Classifying",
                 unit=" tickets") as pbar:
            
            batch_results = []
            
            for idx, ticket_id, description in tickets:
                classification = self.classify_single_ticket(description)
                
                result = {
                    'id': ticket_id,
                    'description': description,
                    'category': classification['category'],
                    'priority': classification['priority'],
                    'has_error': classification.get('error', False)
                }
                
                batch_results.append(result)
                
                if result['has_error']:
                    error_count += 1
                
                pbar.update(1)
                
                elapsed = time.time() - start_time
                speed = pbar.n / elapsed if elapsed > 0 else 0
                pbar.set_description(f"🔄 Classifying ({speed:.1f}/sec)")
                
                if len(batch_results) >= SAVE_INTERVAL:
                    all_results.extend(batch_results)
                    self.save_checkpoint(all_results)
                    batch_results = []
            
            if batch_results:
                all_results.extend(batch_results)
                self.save_checkpoint(all_results)
        
        print(f"\n💾 Saving to: {OUTPUT_CSV}")
        
        with open(OUTPUT_CSV, 'w', encoding='utf-8', newline='') as f:
            fieldnames = ['id', 'description', 'category', 'priority']
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            
            for result in all_results:
                writer.writerow({
                    'id': result['id'],
                    'description': result['description'],
                    'category': result['category'],
                    'priority': result['priority']
                })
        
        if Path(self.checkpoint_file).exists():
            Path(self.checkpoint_file).unlink()
        
        total_time = time.time() - start_time
        total = len(all_results)
        
        print(f"\n{'='*70}")
        print(f"✅ COMPLETE!")
        print(f"{'='*70}")
        print(f"📊 Total: {total:,}")
        print(f"✅ Success: {total - error_count:,}")
        print(f"❌ Errors: {error_count:,} ({error_count/total*100:.1f}%)")
        print(f"⏱️  Time: {total_time/60:.1f} min ({total_time/3600:.2f} hrs)")
        print(f"⚡ Speed: {total/total_time:.2f} tickets/sec")
        print(f"{'='*70}\n")
        
        self.generate_summary(all_results)
    
    def generate_summary(self, results: list):
        """Generate classification summary"""
        total = len(results)
        
        cat_count = {}
        for r in results:
            cat = r['category']
            cat_count[cat] = cat_count.get(cat, 0) + 1
        
        pri_count = {}
        for r in results:
            pri = r['priority']
            pri_count[pri] = pri_count.get(pri, 0) + 1
        
        print("📊 SUMMARY")
        print("="*70)
        
        print("\n📁 CATEGORIES:")
        print("-"*70)
        for cat in sorted(CATEGORIES):
            count = cat_count.get(cat, 0)
            pct = (count / total * 100) if total > 0 else 0
            bar = '█' * int(pct / 2)
            print(f"{cat:15s}: {count:6,} ({pct:5.1f}%) {bar}")
        
        print(f"\n⚡ PRIORITIES:")
        print("-"*70)
        for pri in PRIORITIES:
            count = pri_count.get(pri, 0)
            pct = (count / total * 100) if total > 0 else 0
            bar = '█' * int(pct / 2)
            print(f"{pri:10s}: {count:6,} ({pct:5.1f}%) {bar}")
        
        print(f"\n{'='*70}")
        print(f"💾 Output: {OUTPUT_CSV}")
        print(f"{'='*70}\n")


# =============================================================================
# MAIN PROGRAM
# =============================================================================

def main():
    classifier = TicketClassifier()
    classifier.classify_all_tickets()
    print("🎉 Done! Check: " + OUTPUT_CSV + "\n")


if __name__ == "__main__":
    main()