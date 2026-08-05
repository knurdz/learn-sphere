"""Adds meme templates to public/meme-templates/config.json.

Boxes are written as fractions of the image so they can be reasoned about
visually, then converted to the pixel coordinates the renderer expects.
"""

import json
import pathlib
import struct

TEMPLATES_DIR = pathlib.Path(__file__).resolve().parent.parent / "public" / "meme-templates"

# file, description, shapes, text/stroke colors, stroke width,
# slots: name -> (x0, y0, x1, y1) fractions, font fraction of height
SPECS = {
    "two_buttons": {
        "file": "two_buttons.jpg",
        "description": "A sweating person agonises over two red buttons, unable to choose between two options that both feel necessary.",
        "shapes": ["dilemma", "preference"],
        "text_color": "black",
        "stroke_color": "white",
        "stroke_width": 2,
        "font": 0.026,
        "slots": {
            # Above each red button so the caption never covers it.
            "first_option": (0.06, 0.11, 0.52, 0.25),
            "second_option": (0.45, 0.07, 0.85, 0.17),
            "anxious_decider": (0.05, 0.84, 0.95, 0.97),
        },
    },
    "distracted_boyfriend": {
        "file": "distracted_boyfriend.jpg",
        "description": "Someone walking with a partner turns to gawk at a more tempting option while the partner glares in disbelief.",
        "shapes": ["preference", "betrayal"],
        "text_color": "white",
        "stroke_color": "black",
        "stroke_width": 3,
        "font": 0.042,
        "slots": {
            "tempting_option": (0.04, 0.66, 0.40, 0.88),
            "the_decider": (0.40, 0.54, 0.66, 0.76),
            "neglected_option": (0.66, 0.56, 0.98, 0.80),
        },
    },
    "uno_draw_25": {
        "file": "uno_draw_25.jpg",
        "description": "An UNO card demands you either do something reasonable or draw 25 cards, and the player would rather hold the whole deck.",
        "shapes": ["dilemma", "escalation"],
        "text_color": "black",
        "stroke_color": "white",
        "stroke_width": 2,
        "font": 0.045,
        "slots": {
            "simple_demand": (0.05, 0.19, 0.46, 0.47),
        },
    },
    "epic_handshake": {
        "file": "epic_handshake.jpg",
        "description": "Two very different arms clasp hands, agreeing on one shared idea.",
        "shapes": ["preference", "irony"],
        "text_color": "white",
        "stroke_color": "black",
        "stroke_width": 3,
        "font": 0.045,
        "slots": {
            "shared_truth": (0.27, 0.02, 0.73, 0.17),
            "first_side": (0.01, 0.72, 0.34, 0.95),
            "second_side": (0.66, 0.72, 0.99, 0.95),
        },
    },
    "grus_plan": {
        "file": "grus_plan.jpg",
        "description": "A four panel plan on a flip chart where the confident planner reads the final step and realises it ruins everything.",
        "shapes": ["escalation", "irony"],
        "text_color": "black",
        "stroke_color": "white",
        "stroke_width": 2,
        "font": 0.038,
        "slots": {
            "step_one": (0.29, 0.07, 0.48, 0.43),
            "step_two": (0.79, 0.07, 0.98, 0.43),
            "consequence": (0.29, 0.57, 0.48, 0.94),
            "realisation": (0.79, 0.57, 0.98, 0.94),
        },
    },
    "expanding_brain": {
        "file": "expanding_brain.jpg",
        "description": "Four escalating panels where the brain glows brighter as the take gets more sophisticated.",
        "shapes": ["escalation"],
        "text_color": "black",
        "stroke_color": "white",
        "stroke_width": 2,
        "font": 0.022,
        "slots": {
            "basic_take": (0.02, 0.02, 0.46, 0.22),
            "better_take": (0.02, 0.27, 0.46, 0.47),
            "deeper_take": (0.02, 0.52, 0.46, 0.71),
            "galaxy_take": (0.02, 0.77, 0.46, 0.97),
        },
    },
    "same_picture": {
        "file": "same_picture.jpg",
        "description": "Someone holds up two pictures asked to spot the difference, then flatly states they are the same picture.",
        "shapes": ["irony", "preference"],
        "text_color": "black",
        "stroke_color": "white",
        "stroke_width": 2,
        "font": 0.026,
        "slots": {
            "first_picture": (0.17, 0.05, 0.49, 0.25),
            "second_picture": (0.64, 0.11, 0.96, 0.36),
        },
    },
    "this_is_fine": {
        "file": "this_is_fine.jpg",
        "description": "A dog sits calmly in a burning room insisting everything is fine.",
        "shapes": ["irony", "escalation"],
        "text_color": "white",
        "stroke_color": "black",
        "stroke_width": 2,
        "font": 0.075,
        "slots": {
            "burning_situation": (0.02, 0.03, 0.48, 0.22),
            "reassuring_lie": (0.52, 0.70, 0.98, 0.96),
        },
    },
    "boardroom_meeting": {
        "file": "boardroom_meeting.jpg",
        "description": "A boss asks a room for ideas, likes the first answers, then throws the person with the inconvenient answer out of the window.",
        "shapes": ["betrayal", "dilemma"],
        "text_color": "black",
        "stroke_color": "white",
        "stroke_width": 1,
        "font": 0.018,
        "slots": {
            "the_question": (0.30, 0.015, 0.92, 0.095),
            "safe_answer": (0.03, 0.375, 0.27, 0.465),
            "another_answer": (0.31, 0.385, 0.50, 0.46),
            "inconvenient_truth": (0.61, 0.39, 0.89, 0.47),
        },
    },
    "woman_yelling_at_cat": {
        "file": "woman_yelling_at_cat.jpg",
        "description": "Someone screams an accusation while an unbothered cat sits with the plain reality in front of it.",
        "shapes": ["betrayal", "irony"],
        "text_color": "white",
        "stroke_color": "black",
        "stroke_width": 3,
        "font": 0.062,
        "slots": {
            "loud_accusation": (0.02, 0.60, 0.49, 0.95),
            "calm_reality": (0.52, 0.60, 0.98, 0.95),
        },
    },
    "roll_safe": {
        "file": "roll_safe.jpg",
        "description": "A man taps his temple, pleased with reasoning that sounds clever but falls apart immediately.",
        "shapes": ["irony", "dilemma"],
        "text_color": "white",
        "stroke_color": "black",
        "stroke_width": 3,
        "font": 0.075,
        "slots": {
            "clever_sounding_plan": (0.03, 0.03, 0.97, 0.25),
            "obvious_flaw": (0.03, 0.76, 0.97, 0.97),
        },
    },
    "spiderman_pointing": {
        "file": "spiderman_pointing.jpg",
        "description": "Two identical figures point accusingly at each other, unable to tell which is the real one.",
        "shapes": ["irony", "betrayal"],
        "text_color": "white",
        "stroke_color": "black",
        "stroke_width": 3,
        "font": 0.065,
        "slots": {
            "first_thing": (0.02, 0.72, 0.47, 0.96),
            "look_alike_thing": (0.53, 0.72, 0.98, 0.96),
        },
    },
    "surprised_pikachu": {
        "file": "surprised_pikachu.jpg",
        "description": "A character is open mouthed with shock at a consequence that was completely predictable.",
        "shapes": ["escalation", "betrayal"],
        "text_color": "black",
        "stroke_color": "white",
        "stroke_width": 1,
        "font": 0.042,
        "slots": {
            "predictable_consequence": (0.03, 0.04, 0.97, 0.36),
        },
    },
    "batman_slapping_robin": {
        "file": "batman_slapping_robin.jpg",
        "description": "A sidekick starts to say something wrong and gets slapped mid sentence with the correction.",
        "shapes": ["betrayal", "dilemma"],
        "text_color": "black",
        "stroke_color": "white",
        "stroke_width": 1,
        "font": 0.045,
        "slots": {
            "wrong_claim": (0.04, 0.04, 0.40, 0.26),
            "sharp_correction": (0.47, 0.04, 0.90, 0.26),
        },
    },
    "waiting_skeleton": {
        "file": "waiting_skeleton.jpg",
        "description": "A skeleton has waited on a bench so long it decayed, still waiting for something that never arrives.",
        "shapes": ["escalation", "dilemma"],
        "text_color": "white",
        "stroke_color": "black",
        "stroke_width": 2,
        "font": 0.062,
        "slots": {
            "still_waiting_for": (0.03, 0.02, 0.97, 0.22),
            "how_long": (0.03, 0.78, 0.97, 0.97),
        },
    },
    "trade_offer": {
        "file": "trade_offer.jpg",
        "description": "Someone pitches a trade offer, listing what they receive against what you receive.",
        "shapes": ["preference", "dilemma"],
        "text_color": "white",
        "stroke_color": "black",
        "stroke_width": 2,
        "font": 0.035,
        "slots": {
            "i_receive": (0.06, 0.24, 0.47, 0.46),
            "you_receive": (0.53, 0.24, 0.96, 0.46),
        },
    },
}


def jpeg_size(path: pathlib.Path) -> tuple[int, int]:
    data = path.read_bytes()
    offset = 2
    while offset + 9 < len(data):
        if data[offset] != 0xFF:
            offset += 1
            continue
        marker = data[offset + 1]
        (length,) = struct.unpack(">H", data[offset + 2 : offset + 4])
        if 0xC0 <= marker <= 0xC3 and marker != 0xC1:
            height, width = struct.unpack(">HH", data[offset + 5 : offset + 9])
            return width, height
        offset += 2 + length
    raise ValueError(f"Could not read dimensions for {path.name}")


def main() -> None:
    config_path = TEMPLATES_DIR / "config.json"
    config = json.loads(config_path.read_text())

    for template_id, spec in SPECS.items():
        path = TEMPLATES_DIR / spec["file"]
        width, height = jpeg_size(path)
        font = max(14, round(spec["font"] * height))
        config[template_id] = {
            "file": spec["file"],
            "description": spec["description"],
            "shapes": spec["shapes"],
            "text_color": spec["text_color"],
            "stroke_color": spec["stroke_color"],
            "stroke_width": spec["stroke_width"],
            "slots": [
                {
                    "name": name,
                    "box": [
                        round(box[0] * width),
                        round(box[1] * height),
                        round(box[2] * width),
                        round(box[3] * height),
                    ],
                    "max_font": font,
                }
                for name, box in spec["slots"].items()
            ],
        }
        print(f"{template_id}: {width}x{height} font={font} slots={len(spec['slots'])}")

    config_path.write_text(json.dumps(config, indent=2) + "\n")
    print(f"\n{len(config)} templates in config.json")


if __name__ == "__main__":
    main()
