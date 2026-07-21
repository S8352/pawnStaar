import random
from typing import Dict, List, Any

class RoastingEngine:
    def __init__(self):
        self.character_templates = self._load_character_templates()
    
    def generate_roast(self, character_id: int, move_analysis: dict, patterns: list) -> dict:
        """Generate character-specific roast based on move analysis"""
        character = self.character_templates.get(character_id, self.character_templates[2])  # Default to Ben Finegold
        
        # Determine roast type based on centipawn loss
        centipawn_loss = move_analysis.get('centipawn_loss', 0)
        
        if centipawn_loss > 300:  # Blunder
            roast_type = 'blunder'
        elif centipawn_loss > 100:  # Mistake
            roast_type = 'mistake'
        elif centipawn_loss > 50:  # Inaccuracy
            roast_type = 'inaccuracy'
        else:  # Good move
            roast_type = 'brilliant'
        
        # Get random response from appropriate category
        responses = character.get(f'{roast_type}_responses', ['Nice move!'])
        roast_text = random.choice(responses)
        
        return {
            'roast_text': roast_text,
            'roast_type': roast_type,
            'character_name': character['display_name'],
            'intensity': character['intensity']
        }
    
    def _load_character_templates(self) -> Dict[int, Dict[str, Any]]:
        """Load character personality configurations"""
        return {
            1: {  # Hikaru Nakamura
                'display_name': 'Hikaru Nakamura',
                'tone': 'confident',
                'intensity': 4,
                'blunder_responses': [
                    "There was literally mate in 2 and you missed it. Chat, can we get some F's?",
                    "That move was so bad, even I'm speechless. And I'm never speechless.",
                    "You just blundered harder than my last tournament opponent. And that's saying something.",
                    "Chat, we need to have a serious conversation about this move.",
                    "That's not how you play chess. That's how you lose chess in the most embarrassing way possible."
                ],
                'mistake_responses': [
                    "Okay, that's not great. You're better than this.",
                    "Come on, you know better than that move.",
                    "That's a mistake, but we can recover from this.",
                    "Chat, this is why we practice tactics every day.",
                    "Not your best move, but let's see if we can salvage this position."
                ],
                'inaccuracy_responses': [
                    "Not the best move, but it's playable.",
                    "There were better options, but this works.",
                    "Decent move, but we can do better.",
                    "That's okay, but there was a more accurate way to play this.",
                    "Playable, but not optimal. Let's keep improving."
                ],
                'brilliant_responses': [
                    "Okay, that was actually pretty clean. I'm impressed.",
                    "Now THAT'S how you play chess! Beautiful move.",
                    "Chat, we just witnessed greatness. Take notes.",
                    "That's a brilliant move! You're thinking like a grandmaster.",
                    "Excellent! That's the kind of move that wins games."
                ]
            },
            2: {  # Ben Finegold
                'display_name': 'Ben Finegold',
                'tone': 'sarcastic',
                'intensity': 3,
                'blunder_responses': [
                    "Oh no, no, no. That's not how you play chess. That's how you lose chess.",
                    "I've seen better moves from my 6-year-old students. And they're 6.",
                    "That move was so bad, I'm going to need to charge you extra for this lesson.",
                    "Oh dear, that's not the right move here. Let me explain why this doesn't work.",
                    "That's a blunder of epic proportions. We need to go back to basics."
                ],
                'mistake_responses': [
                    "That's a mistake. Let me explain why this doesn't work.",
                    "Oh dear, that's not the right move here.",
                    "I'm going to need to add this to my 'what not to do' examples.",
                    "That's not how we play chess. Let's think about this more carefully.",
                    "Mistake. But don't worry, we all make them. The key is learning from them."
                ],
                'inaccuracy_responses': [
                    "That's not terrible, but it's not great either.",
                    "There were better moves available, but this is playable.",
                    "Not the worst move, but definitely not the best.",
                    "That's okay, but we can do better than that.",
                    "Playable, but not optimal. Let's keep working on accuracy."
                ],
                'brilliant_responses': [
                    "Finally! A move that doesn't make me want to cry.",
                    "Now you're thinking like a chess player. Keep it up.",
                    "That's the kind of move that makes me proud to be a teacher.",
                    "Excellent! That's how you play chess properly.",
                    "Now that's what I'm talking about! Beautiful chess."
                ]
            },
            3: {  # Magnus Carlsen
                'display_name': 'Magnus Carlsen',
                'tone': 'strategic',
                'intensity': 2,
                'blunder_responses': [
                    "That move doesn't make sense from a positional standpoint.",
                    "You've just given away your advantage completely.",
                    "This is not how you play chess at the highest level.",
                    "That's a fundamental misunderstanding of the position.",
                    "You need to think more about the long-term consequences of your moves."
                ],
                'mistake_responses': [
                    "That's a positional mistake. Let me show you why.",
                    "You're not thinking about the long-term consequences.",
                    "This move weakens your position unnecessarily.",
                    "That's not the most accurate way to handle this position.",
                    "You need to consider the strategic implications of your moves."
                ],
                'inaccuracy_responses': [
                    "There were more precise moves available.",
                    "This is okay, but not optimal.",
                    "You can do better than this.",
                    "That's playable, but there were more accurate options.",
                    "Not bad, but we can be more precise."
                ],
                'brilliant_responses': [
                    "Excellent positional understanding.",
                    "That's a very strong move. Well played.",
                    "You're showing good chess intuition here.",
                    "That's the kind of move that separates good players from great ones.",
                    "Beautiful chess. You're thinking several moves ahead."
                ]
            },
            4: {  # GothamChess (Levy Rozman)
                'display_name': 'GothamChess',
                'tone': 'entertaining',
                'intensity': 4,
                'blunder_responses': [
                    "Oh no! That's a blunder of epic proportions!",
                    "Chat, we just witnessed a disaster. Can we get some F's in the chat?",
                    "That move was so bad, I'm going to need to make a video about it.",
                    "Oh my goodness, that's not how you play chess!",
                    "Chat, this is why we don't play chess at 3 AM!"
                ],
                'mistake_responses': [
                    "That's a mistake, but don't worry, we can recover!",
                    "Not the best move, but let's see what we can do.",
                    "Chat, this is a learning moment. Let's see how to fix this.",
                    "That's not ideal, but we're not dead yet!",
                    "Mistake, but we can still fight back!"
                ],
                'inaccuracy_responses': [
                    "That's okay, but we can do better!",
                    "Not bad, but there were more accurate moves.",
                    "Playable, but let's aim for perfection!",
                    "That's decent, but we can be more precise.",
                    "Okay move, but we're looking for the best moves!"
                ],
                'brilliant_responses': [
                    "OH MY GOODNESS! That's a brilliant move!",
                    "Chat, we just witnessed greatness! That's how you play chess!",
                    "That's absolutely beautiful! I'm impressed!",
                    "Wow! That's the kind of move that wins games!",
                    "Chat, take notes! That's how you play chess properly!"
                ]
            },
            5: {  # Anna Cramling
                'display_name': 'Anna Cramling',
                'tone': 'encouraging',
                'intensity': 2,
                'blunder_responses': [
                    "Oh no, that's not the right move here. But don't worry, we can learn from this!",
                    "That's a blunder, but everyone makes them. The important thing is to keep playing!",
                    "Not the best move, but let's see how we can improve from here.",
                    "That's okay, we all have bad moves. Let's focus on the next one!",
                    "Don't be discouraged! Even grandmasters make mistakes. Let's keep going!"
                ],
                'mistake_responses': [
                    "That's a mistake, but it's not the end of the world!",
                    "Not ideal, but we can still make this work!",
                    "That's okay, we all make mistakes. Let's see what we can do next!",
                    "Don't worry about it! Let's focus on finding the best moves from here.",
                    "That's not perfect, but we're still in the game!"
                ],
                'inaccuracy_responses': [
                    "That's okay, but we can do even better!",
                    "Not bad, but let's try to be more accurate!",
                    "That's decent, but we're aiming for the best moves!",
                    "Good effort, but there might be something even better!",
                    "That's playable, but let's see if we can find something more precise!"
                ],
                'brilliant_responses': [
                    "That's a beautiful move! Well done!",
                    "Excellent! You're really improving!",
                    "That's fantastic! You're thinking like a strong player!",
                    "Wow, that's a really nice move! Keep it up!",
                    "That's the kind of move that shows you're getting stronger!"
                ]
            }
        }
    
    def get_character_info(self, character_id: int) -> dict:
        """Get character information for API responses"""
        character = self.character_templates.get(character_id)
        if not character:
            return None
        
        return {
            'id': character_id,
            'name': character['display_name'],
            'description': f"{character['tone']} commentary with intensity {character['intensity']}/5",
            'sample_roast': character['blunder_responses'][0] if character['blunder_responses'] else "Nice move!",
            'tone': character['tone'],
            'intensity': character['intensity']
        }
    
    def get_all_characters(self) -> List[dict]:
        """Get all available characters"""
        return [self.get_character_info(char_id) for char_id in self.character_templates.keys()]

