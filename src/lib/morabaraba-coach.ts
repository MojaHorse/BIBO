import {
  MorabarabaEngine,
  PointId,
  CowColor,
  GamePhase,
  MorabarabaVariant,
  ALL_24_POINTS,
  ALL_25_POINTS,
  ADJACENCY_24,
  ADJACENCY_25,
} from './morabaraba-engine';

export interface MorabarabaCoachCommentary {
  type: 'brilliant' | 'good' | 'warning' | 'blunder' | 'opening' | 'hint';
  title: string;
  message: string;
  suggestedAction?: {
    type: 'place' | 'move' | 'shoot';
    from?: PointId;
    to?: PointId;
    shot?: PointId;
  };
}

export class MorabarabaCoachEngine {
  /**
   * Analyze an action and return tactical Kraal commentary.
   */
  public analyzeAction(
    engineBefore: MorabarabaEngine,
    engineAfter: MorabarabaEngine,
    action: {
      type: 'place' | 'move' | 'reposition' | 'shoot';
      from?: PointId;
      to?: PointId;
      shot?: PointId;
    },
    historyLength: number
  ): MorabarabaCoachCommentary {
    const turn = engineBefore.getTurn();

    // 1. Victory Check
    const winner = engineAfter.checkWinner();
    if (winner === turn) {
      return {
        type: 'brilliant',
        title: 'Kraal Domination (Victory)!',
        message:
          'Flawless tactical triumph! You reduced opposing cattle below 3 or trapped the entire herd with zero legal escapes.',
      };
    }

    // 2. Shoot Action (Cow captured)
    if (action.type === 'shoot' && action.shot) {
      return {
        type: 'good',
        title: 'Cow Shot & Removed!',
        message: `Enemy cow at ${action.shot} removed from the Kraal. Reducing enemy herd size brings you closer to the decisive endgame.`,
      };
    }

    const targetPoint = action.to;
    if (!targetPoint) {
      return {
        type: 'good',
        title: 'Tactical Maneuver',
        message: 'Steady development in the Kraal.',
      };
    }

    // 3. Mill Formed (Flike!)
    if (engineAfter.getState().shootPending) {
      return {
        type: 'brilliant',
        title: 'Flike! (Mill Formed)',
        message:
          'Three-in-a-row completed! You have seized the tactical initiative—select an enemy cow to shoot and remove it from the board.',
      };
    }

    // 4. Koti 25-Point Center Dot (C0)
    if (targetPoint === 'C0') {
      return {
        type: 'brilliant',
        title: 'Center Hub (C0) Occupied!',
        message:
          'Superb positioning! The Center Dot (C0) connects to all 8 inner-ring intersections and commands 4 crossing mills across the board.',
      };
    }

    // 5. Cross-Ring Spoke Control (O1, M1, I1, O3, etc.)
    const SPOKE_POINTS: PointId[] = ['O1', 'M1', 'I1', 'O3', 'M3', 'I3', 'O5', 'M5', 'I5', 'O7', 'M7', 'I7'];
    if (SPOKE_POINTS.includes(targetPoint)) {
      return {
        type: 'good',
        title: 'Spoke Node Anchor',
        message:
          'Spoke intersections bridge concentric rings and participate in both orthogonal and ring mills. Controlling them limits enemy sliding lanes.',
      };
    }

    // 6. Flying Phase (3 Cows Remaining)
    if (engineAfter.getState().phase === 'flying' && engineBefore.getState().phase !== 'flying') {
      return {
        type: 'brilliant',
        title: 'Aerial Phase Active!',
        message:
          'Your herd has been reduced to 3 cows, unlocking Flight! You can now hop directly to ANY open intersection to assemble surprise mills.',
      };
    }

    // 7. Early Placing Phase Tactics
    if (engineBefore.getState().phase === 'placing' && historyLength <= 6) {
      return {
        type: 'opening',
        title: 'Kraal Deployment',
        message:
          'Strong placement. In the opening phase, aim to occupy intersections that belong to 2 or 3 potential mill axes to engineer double-threat forks.',
      };
    }

    return {
      type: 'good',
      title: 'Positional Advance',
      message:
        'Clean tactical slide. Keep your cattle connected in defensive triangles and watch out for opponent 2-in-a-row setups.',
    };
  }

  /**
   * Analyze an opponent (bot) move and explain to the player what just happened.
   */
  public analyzeOpponentAction(
    action: {
      type: 'move' | 'place' | 'shoot';
      from?: PointId;
      to?: PointId;
      shot?: PointId;
      millFormed?: boolean;
    }
  ): MorabarabaCoachCommentary {
    if (action.type === 'shoot' && action.shot) {
      return {
        type: 'blunder',
        title: 'Enemy Mill & Capture!',
        message: `The Bot completed a 3-in-a-row Mill and shot your cow at ${action.shot}! Look to block any other 2-in-a-row lines to prevent further casualties.`,
      };
    }

    if (action.millFormed && action.to) {
      return {
        type: 'warning',
        title: 'Opponent Formed a Mill!',
        message: `The Bot aligned 3 cows at ${action.to} to trigger a shot against your herd.`,
      };
    }

    return {
      type: 'good',
      title: 'Your Turn',
      message: 'The Bot completed its turn. Evaluate the Kraal spokes, check for potential mills, and slide your cow.',
    };
  }

  /**
   * Provide a strategic hint for the current turn in Morabaraba.
   */
  public getHint(engine: MorabarabaEngine): MorabarabaCoachCommentary {
    const state = engine.getState();

    // 1. Shoot mode hint
    if (state.shootPending) {
      const opponent: CowColor = state.turn === 'w' ? 'b' : 'w';
      const shootable = engine.getShootableCows(opponent);
      if (shootable.length > 0) {
        const target = shootable[0];
        return {
          type: 'hint',
          title: 'Shoot Priority Advice',
          message: `Shoot the enemy cow at ${target} to dismantle their structure and prevent counter-mills.`,
          suggestedAction: { type: 'shoot', shot: target },
        };
      }
    }

    // 2. Best Bot Action as Hint
    const action = engine.findBestBotAction('hard');
    if (action) {
      if (action.type === 'place' && action.to) {
        let reason = `Placing at ${action.to} advances your mill network and contests key spokes.`;
        if (action.to === 'C0') reason = 'Drop your cow at C0 to control the central 8-way hub!';
        return {
          type: 'hint',
          title: 'Recommended Placement',
          message: reason,
          suggestedAction: action,
        };
      }

      if (action.type === 'move' && action.from && action.to) {
        return {
          type: 'hint',
          title: 'Recommended Slide',
          message: `Slide from ${action.from} to ${action.to} to maximize pressure and open new mill opportunities.`,
          suggestedAction: action,
        };
      }
    }

    return {
      type: 'hint',
      title: 'Tactical Advice',
      message: 'Look for intersections that connect to existing friendly cattle or block opposing 2-in-a-row lines.',
    };
  }
}

export const morabarabaCoach = new MorabarabaCoachEngine();
