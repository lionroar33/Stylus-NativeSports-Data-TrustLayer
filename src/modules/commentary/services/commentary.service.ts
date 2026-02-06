/**
 * Commentary Engine - NLG Pipeline
 * Phase 4: AI-powered commentary with 12 triggers
 */

import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { RedisService } from '../../../shared/redis/redis.service';
import { CommentaryTrigger } from '../../events/interfaces/cricket.interface';

export type CommentaryPersona = 'play_by_play' | 'energetic' | 'coaching';
export type CommentaryPriority = 'low' | 'medium' | 'high' | 'critical';

interface CommentaryTemplate {
  trigger: CommentaryTrigger;
  templates: {
    play_by_play: string[];
    energetic: string[];
    coaching: string[];
  };
  priority: CommentaryPriority;
  cooldownMs: number;
}

interface GeneratedCommentary {
  matchId: string;
  trigger: CommentaryTrigger;
  message: string;
  persona: CommentaryPersona;
  priority: CommentaryPriority;
  timestamp: Date;
}

@Injectable()
export class CommentaryService {
  private readonly logger = new Logger(CommentaryService.name);
  private cooldowns: Map<string, Map<CommentaryTrigger, number>> = new Map();
  private defaultPersona: CommentaryPersona = 'play_by_play';

  // Commentary templates for all 12 triggers
  private readonly templates: CommentaryTemplate[] = [
    // 1. BOUNDARY
    {
      trigger: CommentaryTrigger.BOUNDARY,
      templates: {
        play_by_play: [
          'Cracking shot through the covers! Four runs.',
          'Beautifully placed through the gap. Four more.',
          'Timing perfection! That races away to the boundary.',
          'Found the gap and away it goes for four.',
        ],
        energetic: [
          'FOUR! What a shot! The ball screams to the boundary!',
          'BOOM! That\'s been hammered to the fence!',
          'OH YES! Textbook cover drive for FOUR!',
          'SHOT! Nobody stopping that one! Four runs!',
        ],
        coaching: [
          'Good shot placement there. Used the pace of the ball well.',
          'Smart cricket - identified the gap and executed perfectly.',
          'Notice the head position and balance through the shot.',
          'Weight transfer was excellent on that boundary.',
        ],
      },
      priority: 'medium',
      cooldownMs: 0,
    },
    // 2. SIX
    {
      trigger: CommentaryTrigger.SIX,
      templates: {
        play_by_play: [
          'That\'s gone all the way! Maximum! Six runs.',
          'High and handsome! Over the boundary for six.',
          'Massive hit! That clears the ropes comfortably.',
          'Into the stands! A clean strike for six.',
        ],
        energetic: [
          'SIX! THAT\'S ABSOLUTELY MASSIVE! OUT OF THE GROUND!',
          'IT\'S A MONSTER HIT! SIX ALL THE WAY!',
          'WOW! WHAT A STRIKE! GONE INTO ORBIT!',
          'HUGE! That\'s gone miles! Maximum!',
        ],
        coaching: [
          'Great use of the long handle there. Got under it perfectly.',
          'Full swing with excellent bat speed. Clearing the front leg.',
          'That\'s the result of good footwork to the pitch of the ball.',
          'Power comes from the core rotation - demonstrated brilliantly here.',
        ],
      },
      priority: 'high',
      cooldownMs: 0,
    },
    // 3. WICKET
    {
      trigger: CommentaryTrigger.WICKET,
      templates: {
        play_by_play: [
          'OUT! The batsman has to go. Big wicket.',
          'Gone! The appeal goes up and the finger is raised.',
          'Wicket! That\'s a crucial breakthrough.',
          'He\'s out! The bowler celebrates.',
        ],
        energetic: [
          'WICKET! YES! THE STUMPS ARE SHATTERED!',
          'OUT! WHAT A DELIVERY! HE\'S GOT TO GO!',
          'GONE! Massive celebration from the bowling side!',
          'THAT\'S OUT! The crowd goes absolutely wild!',
        ],
        coaching: [
          'Excellent line and length there. The batsman had no answer.',
          'Set him up beautifully over the last few balls.',
          'Look at the seam position - that was always going to trouble.',
          'Patience from the bowler pays off. Stuck to the plan.',
        ],
      },
      priority: 'critical',
      cooldownMs: 0,
    },
    // 4. MAIDEN OVER
    {
      trigger: CommentaryTrigger.MAIDEN_OVER,
      templates: {
        play_by_play: [
          'That\'s a maiden! Excellent tight bowling.',
          'No runs conceded. A maiden over completed.',
          'Dot ball to finish. It\'s a maiden.',
          'Six balls, zero runs. Superb over.',
        ],
        energetic: [
          'MAIDEN OVER! What disciplined bowling!',
          'A MAIDEN! Building pressure beautifully!',
          'Six dot balls in a row! The bowler is ON FIRE!',
          'Nothing given away! A PERFECT over!',
        ],
        coaching: [
          'Consistent line and length. Making the batsman play every ball.',
          'Building pressure - that\'s how you take wickets.',
          'Notice how he\'s using the crease and varying the pace slightly.',
          'Economy is key in limited overs. This is how it\'s done.',
        ],
      },
      priority: 'medium',
      cooldownMs: 0,
    },
    // 5. FIFTY (50 runs)
    {
      trigger: CommentaryTrigger.FIFTY,
      templates: {
        play_by_play: [
          'Fifty up! A well-deserved half-century.',
          'That\'s 50! Take a bow, what an innings.',
          'The half-century is reached. Great knock.',
          '50 runs for the batsman. Quality innings.',
        ],
        energetic: [
          'FIFTY! WHAT AN INNINGS! THE BAT IS RAISED!',
          'HALF-CENTURY! THE CROWD ON THEIR FEET!',
          'FIFTY UP! Sensational batting display!',
          'THE MILESTONE! 50 runs! BRILLIANT!',
        ],
        coaching: [
          'Played with excellent judgment. Rotated strike well.',
          'Built the innings patiently. Key is picking the right balls.',
          'Good balance between attack and defense in this fifty.',
          'Shot selection has been immaculate throughout.',
        ],
      },
      priority: 'high',
      cooldownMs: 0,
    },
    // 6. HUNDRED (100 runs)
    {
      trigger: CommentaryTrigger.HUNDRED,
      templates: {
        play_by_play: [
          'CENTURY! A magnificent hundred! What an innings!',
          '100 up! A truly special knock.',
          'The century is complete. Standing ovation deserved.',
          'Three figures! A superb hundred.',
        ],
        energetic: [
          'CENTURY! ABSOLUTELY MAGNIFICENT! A HUNDRED RUNS!',
          'ONE HUNDRED! WHAT A PLAYER! WHAT AN INNINGS!',
          'HE\'S DONE IT! A SENSATIONAL CENTURY!',
          'THE ARMS ARE RAISED! HUNDRED UP! INCREDIBLE!',
        ],
        coaching: [
          'Complete batting masterclass. Adapted to every phase perfectly.',
          'Concentration levels have been exceptional throughout.',
          'This is what we call a match-winning innings.',
          'Every young player should study this knock.',
        ],
      },
      priority: 'critical',
      cooldownMs: 0,
    },
    // 7. FIVE WICKET HAUL
    {
      trigger: CommentaryTrigger.FIVE_WICKET_HAUL,
      templates: {
        play_by_play: [
          'Five wickets! A five-wicket haul. Brilliant bowling.',
          'That\'s five! A fantastic bowling performance.',
          'The fifth wicket falls. Five-for for the bowler.',
          'Five wickets in the bag. Match-winning spell.',
        ],
        energetic: [
          'FIVE WICKETS! A FIFER! UNSTOPPABLE BOWLING!',
          'FIVE-FOR! WHAT A SPELL! THE BOWLER IS KING TODAY!',
          'THAT\'S FIVE! A DEVASTATING BOWLING PERFORMANCE!',
          'FIVE-WICKET HAUL! The batsmen had NO ANSWER!',
        ],
        coaching: [
          'Varied the pace and length superbly. Kept the batsmen guessing.',
          'Used the conditions brilliantly. Adaptation is key.',
          'This is the reward for maintaining discipline over after over.',
          'Studied the batsmen and exploited their weaknesses.',
        ],
      },
      priority: 'critical',
      cooldownMs: 0,
    },
    // 8. HAT-TRICK
    {
      trigger: CommentaryTrigger.HAT_TRICK,
      templates: {
        play_by_play: [
          'HAT-TRICK! Three wickets in three balls! Incredible!',
          'That\'s a hat-trick! Unbelievable scenes!',
          'Three in three! A hat-trick! Extraordinary!',
          'Hat-trick achieved! A rare and special moment.',
        ],
        energetic: [
          'HAT-TRICK! HAT-TRICK! HAT-TRICK! THIS IS EXTRAORDINARY!',
          'THREE IN THREE! ABSOLUTE SCENES! A HAT-TRICK!',
          'HE\'S DONE THE IMPOSSIBLE! A HAT-TRICK!',
          'HISTORIC! THREE WICKETS IN THREE BALLS! HAT-TRICK!',
        ],
        coaching: [
          'Cool head under pressure. Each delivery was perfectly planned.',
          'Watch the subtle variations - that\'s high-level bowling.',
          'Reading the batsmen\'s minds. A bowling masterclass.',
          'This is what separates good bowlers from great ones.',
        ],
      },
      priority: 'critical',
      cooldownMs: 0,
    },
    // 9. POWERPLAY END
    {
      trigger: CommentaryTrigger.POWERPLAY_END,
      templates: {
        play_by_play: [
          'That\'s the end of the powerplay. Time to reassess.',
          'Powerplay done. The field spreads now.',
          'Six overs completed. Powerplay comes to an end.',
          'End of powerplay. New phase of the innings.',
        ],
        energetic: [
          'POWERPLAY COMPLETE! What a start this has been!',
          'End of the fielding restrictions! Time for middle overs!',
          'POWERPLAY DONE! The game moves to the next phase!',
          'Six overs in the book! The field is spreading!',
        ],
        coaching: [
          'Good time to assess the scoring rate against wickets lost.',
          'Now the game changes - need to rotate strike effectively.',
          'Middle overs require smart cricket. Set partnerships.',
          'Key period coming up. Need to maintain run rate.',
        ],
      },
      priority: 'medium',
      cooldownMs: 0,
    },
    // 10. INNINGS END
    {
      trigger: CommentaryTrigger.INNINGS_END,
      templates: {
        play_by_play: [
          'That\'s the end of the innings. {score}/{wickets} the final total.',
          'Innings complete. {score} runs on the board.',
          'All out / Overs complete. {score}/{wickets} is the target now.',
          'The innings comes to a close. {score} to chase.',
        ],
        energetic: [
          'INNINGS OVER! {score} RUNS ON THE BOARD!',
          'THAT\'S IT! The batting side finishes with {score}/{wickets}!',
          'THE INNINGS IS DONE! A competitive total of {score}!',
          'CHANGE OF INNINGS! {score}/{wickets} is what they\'ve got!',
        ],
        coaching: [
          'Time to analyze the innings. {score} could be challenging.',
          'Breakdown: {score} runs in {overs} overs. Strategic assessment needed.',
          'Par score analysis will be crucial for the chase.',
          'Both teams will be reviewing their game plans now.',
        ],
      },
      priority: 'high',
      cooldownMs: 0,
    },
    // 11. MATCH WON
    {
      trigger: CommentaryTrigger.MATCH_WON,
      templates: {
        play_by_play: [
          '{winner} wins the match by {margin}!',
          'And that\'s it! {winner} are the victors!',
          'Match over! {winner} take the victory.',
          '{winner} have done it! Winners by {margin}.',
        ],
        energetic: [
          '{winner} WIN! WHAT A MATCH! VICTORY BY {margin}!',
          'IT\'S ALL OVER! {winner} ARE CHAMPIONS!',
          'THEY\'VE DONE IT! {winner} WIN BY {margin}!',
          'VICTORY! {winner} TRIUMPHANT! AMAZING SCENES!',
        ],
        coaching: [
          '{winner} executed their game plan better today.',
          'Key moments swung the game. {winner} capitalized.',
          'Lessons for both sides. {winner} showed composure.',
          'Cricket is about pressure moments. {winner} handled them better.',
        ],
      },
      priority: 'critical',
      cooldownMs: 0,
    },
    // 12. DOT BALL PRESSURE
    {
      trigger: CommentaryTrigger.DOT_BALL_PRESSURE,
      templates: {
        play_by_play: [
          'Dot ball. Pressure building.',
          'Another dot. The batsmen need to rotate.',
          'No run. The run rate is climbing.',
          'Dot ball again. Excellent bowling.',
        ],
        energetic: [
          'DOT BALL! The pressure is MOUNTING!',
          'ANOTHER DOT! The bowling side is ON TOP!',
          'NO RUN! Building pressure brilliantly!',
          'DOT! The batsmen are STRUGGLING to score!',
        ],
        coaching: [
          'Good areas from the bowler. Not giving freebies.',
          'Need to find a way to rotate. Dots building pressure.',
          'Score board pressure affecting shot selection.',
          'This is where partnerships break down.',
        ],
      },
      priority: 'low',
      cooldownMs: 5000, // 5 second cooldown to avoid spam
    },
  ];

  constructor(private readonly redisService: RedisService) {}

  // ============================================
  // Event Handlers for Commentary Triggers
  // ============================================

  @OnEvent('commentary.trigger')
  async handleCommentaryTrigger(data: any): Promise<void> {
    const { trigger, matchId, ...context } = data;

    // Check cooldown
    if (this.isOnCooldown(matchId, trigger)) {
      this.logger.debug(`Skipping ${trigger} for match ${matchId} - on cooldown`);
      return;
    }

    // Generate commentary
    const commentary = this.generateCommentary(matchId, trigger, context);
    if (!commentary) {
      return;
    }

    // Set cooldown
    this.setCooldown(matchId, trigger);

    // Publish to Redis for broadcasting
    await this.redisService.publish(`match:${matchId}`, {
      event: 'commentary',
      payload: commentary,
    });

    this.logger.debug(`Generated commentary for ${trigger}: ${commentary.message}`);
  }

  // ============================================
  // Commentary Generation
  // ============================================

  generateCommentary(
    matchId: string,
    trigger: CommentaryTrigger,
    context: Record<string, any> = {},
    persona: CommentaryPersona = this.defaultPersona
  ): GeneratedCommentary | null {
    const template = this.templates.find(t => t.trigger === trigger);
    if (!template) {
      this.logger.warn(`No template found for trigger: ${trigger}`);
      return null;
    }

    const personaTemplates = template.templates[persona];
    if (!personaTemplates || personaTemplates.length === 0) {
      return null;
    }

    // Select random template
    const selectedTemplate = personaTemplates[Math.floor(Math.random() * personaTemplates.length)];

    // Replace placeholders with context values
    let message = selectedTemplate;
    for (const [key, value] of Object.entries(context)) {
      message = message.replace(new RegExp(`\\{${key}\\}`, 'g'), String(value));
    }

    return {
      matchId,
      trigger,
      message,
      persona,
      priority: template.priority,
      timestamp: new Date(),
    };
  }

  // ============================================
  // Cooldown Management
  // ============================================

  private isOnCooldown(matchId: string, trigger: CommentaryTrigger): boolean {
    const template = this.templates.find(t => t.trigger === trigger);
    if (!template || template.cooldownMs === 0) {
      return false;
    }

    const matchCooldowns = this.cooldowns.get(matchId);
    if (!matchCooldowns) {
      return false;
    }

    const lastTrigger = matchCooldowns.get(trigger);
    if (!lastTrigger) {
      return false;
    }

    return Date.now() - lastTrigger < template.cooldownMs;
  }

  private setCooldown(matchId: string, trigger: CommentaryTrigger): void {
    const template = this.templates.find(t => t.trigger === trigger);
    if (!template || template.cooldownMs === 0) {
      return;
    }

    if (!this.cooldowns.has(matchId)) {
      this.cooldowns.set(matchId, new Map());
    }

    this.cooldowns.get(matchId)!.set(trigger, Date.now());
  }

  // ============================================
  // Persona Management
  // ============================================

  setDefaultPersona(persona: CommentaryPersona): void {
    this.defaultPersona = persona;
  }

  getDefaultPersona(): CommentaryPersona {
    return this.defaultPersona;
  }

  getAvailablePersonas(): CommentaryPersona[] {
    return ['play_by_play', 'energetic', 'coaching'];
  }

  // ============================================
  // Utility Methods
  // ============================================

  getAvailableTriggers(): CommentaryTrigger[] {
    return this.templates.map(t => t.trigger);
  }

  clearCooldowns(matchId: string): void {
    this.cooldowns.delete(matchId);
  }
}
