// Manifest generator — creates DemonManifest from rank + registry
//
// The model produces name + seal. This module produces everything else:
// geometry, color, opacity, glow, voice — all randomized within rank constraints,
// with repulsion against existing demons in the same rank.

use rand::seq::SliceRandom;
use rand::Rng;
use serde_json::json;

use crate::storage::demons::{ColorConfig, DemonManifest, GlowConfig};
use crate::storage::genesis_registry::RegistryEntry;

// ─── Geometry catalogs ───────────────────────────────────────────────────────

const MINOR_SHAPES: &[&str] = &["tetrahedron", "cube", "octahedron", "icosahedron", "point_cloud"];
const MAJOR_SHAPES: &[&str] = &["torus", "moebius", "dodecahedron", "torus_knot", "fragmented_cube"];
const PRINCE_PATTERNS: &[&str] = &[
    "counter_rotating", "orbital", "nested", "crowned", "binary", "axis",
];

// ─── Public API ──────────────────────────────────────────────────────────────

/// Generate a complete DemonManifest for the given rank, using the registry for repulsion.
pub fn generate_manifest(rank: &str, registry: &[RegistryEntry]) -> DemonManifest {
    let mut rng = rand::thread_rng();
    let rank_entries: Vec<&RegistryEntry> = registry.iter().filter(|e| e.rank == rank).collect();

    let geometry = match rank {
        "minor" => generate_minor_geometry(&mut rng, &rank_entries),
        "major" => generate_major_geometry(&mut rng, &rank_entries),
        _ => generate_prince_geometry(&mut rng, &rank_entries),
    };

    let (color, opacity) = match rank {
        "prince" => (None, None),
        _ => {
            let hsl = generate_repulsed_color(&mut rng, &rank_entries);
            let hex = hsl_to_hex(hsl);
            (
                Some(ColorConfig {
                    base: hex,
                    variance: rng.gen_range(0.1..0.3),
                }),
                Some(rng.gen_range(0.6..0.9)),
            )
        }
    };

    let glow_hsl = match rank {
        "prince" => {
            // Use first body color lightened for glow
            let base = geometry["bodies"][0]["color"]["base"]
                .as_str()
                .unwrap_or("#ff4444");
            let mut hsl = hex_to_hsl(base);
            hsl[2] = (hsl[2] + 20.0).min(80.0);
            hsl
        }
        _ => {
            let mut hsl = color
                .as_ref()
                .map(|c| hex_to_hsl(&c.base))
                .unwrap_or([0.0, 50.0, 50.0]);
            hsl[2] = (hsl[2] + 20.0).min(80.0);
            hsl
        }
    };

    let voice = generate_voice(&mut rng, rank);

    DemonManifest {
        rank: rank.to_string(),
        geometry,
        scale: 1.0,
        color,
        opacity,
        glow: GlowConfig {
            intensity: rng.gen_range(0.6..1.4),
            color: hsl_to_hex(glow_hsl),
        },
        pulse_frequency: rng.gen_range(0.2..0.8),
        noise_amplitude: rng.gen_range(0.03..0.15),
        output_modes: vec!["text".into(), "visual".into()],
        voice,
    }
}

// ─── Minor geometry ──────────────────────────────────────────────────────────

fn generate_minor_geometry(
    rng: &mut impl Rng,
    rank_entries: &[&RegistryEntry],
) -> serde_json::Value {
    let shape = weighted_pick(rng, MINOR_SHAPES, rank_entries);
    json!({
        "type": shape,
        "rotation": random_rotation(rng, 0.005, 0.02)
    })
}

// ─── Major geometry ──────────────────────────────────────────────────────────

fn generate_major_geometry(
    rng: &mut impl Rng,
    rank_entries: &[&RegistryEntry],
) -> serde_json::Value {
    let shape = weighted_pick(rng, MAJOR_SHAPES, rank_entries);
    let params = major_params(rng, shape);
    let mut geo = json!({
        "type": shape,
        "rotation": random_rotation(rng, 0.008, 0.025)
    });
    if let Some(p) = params {
        geo["params"] = p;
    }
    geo
}

fn major_params(rng: &mut impl Rng, shape: &str) -> Option<serde_json::Value> {
    match shape {
        "torus" => Some(json!({ "radius_ratio": rng.gen_range(0.2..0.5) })),
        "moebius" => {
            let twists = *[1, 2, 3].choose(rng)?;
            Some(json!({ "twists": twists }))
        }
        "torus_knot" => {
            let p_options = [2, 3, 5];
            let q_options = [2, 3, 7];
            let p = *p_options.choose(rng)?;
            let mut q = *q_options.choose(rng)?;
            while q == p {
                q = *q_options.choose(rng)?;
            }
            Some(json!({ "p": p, "q": q }))
        }
        _ => None,
    }
}

// ─── Prince geometry ─────────────────────────────────────────────────────────

fn generate_prince_geometry(
    rng: &mut impl Rng,
    rank_entries: &[&RegistryEntry],
) -> serde_json::Value {
    let pattern = weighted_pattern_pick(rng, rank_entries);
    let all_shapes: Vec<&str> = MINOR_SHAPES.iter().chain(MAJOR_SHAPES.iter()).copied().collect();

    match pattern {
        "counter_rotating" => build_counter_rotating(rng, &all_shapes),
        "orbital" => build_orbital(rng, &all_shapes),
        "nested" => build_nested(rng, &all_shapes),
        "crowned" => build_crowned(rng, &all_shapes),
        "binary" => build_binary(rng, &all_shapes),
        "axis" => build_axis(rng, &all_shapes),
        _ => build_counter_rotating(rng, &all_shapes),
    }
}

fn build_counter_rotating(rng: &mut impl Rng, shapes: &[&str]) -> serde_json::Value {
    let s0 = shapes[rng.gen_range(0..shapes.len())];
    let s1 = shapes[rng.gen_range(0..shapes.len())];
    let speed = rng.gen_range(0.005..0.02);
    let axis0 = random_axis(rng);
    json!({
        "type": "composite",
        "pattern": "counter_rotating",
        "bodies": [
            random_body(rng, s0, 0.9),
            random_body(rng, s1, 0.9),
        ],
        "orbits": [],
        "rotations": [
            { "body": 0, "speed": speed, "axis": axis0 },
            { "body": 1, "speed": -speed, "axis": axis0 },
        ]
    })
}

fn build_orbital(rng: &mut impl Rng, shapes: &[&str]) -> serde_json::Value {
    let n_orbiters: usize = if rng.gen_bool(0.5) { 1 } else { 2 };
    let center_shape = shapes[rng.gen_range(0..shapes.len())];
    let orbit_speed = rng.gen_range(0.005..0.015);
    let orbit_radius = rng.gen_range(1.0..2.0);
    let orbit_axis = random_axis(rng);

    let mut bodies = vec![random_body(rng, center_shape, 0.8)];
    let mut orbits = Vec::new();
    let mut rotations = vec![json!({
        "body": 0, "speed": rng.gen_range(0.005..0.015), "axis": random_axis(rng)
    })];

    let phase_step = 360.0 / (n_orbiters as f64);
    for i in 0..n_orbiters {
        let s = shapes[rng.gen_range(0..shapes.len())];
        bodies.push(random_body(rng, s, 0.5));
        orbits.push(json!({
            "body": i + 1,
            "center": [0, 0, 0],
            "axis": orbit_axis,
            "speed": orbit_speed,
            "direction": 1,
            "radius": orbit_radius,
            "phase": phase_step * i as f64
        }));
        rotations.push(json!({
            "body": i + 1, "speed": rng.gen_range(0.01..0.03), "axis": random_axis(rng)
        }));
    }

    json!({
        "type": "composite",
        "pattern": "orbital",
        "bodies": bodies,
        "orbits": orbits,
        "rotations": rotations
    })
}

fn build_nested(rng: &mut impl Rng, shapes: &[&str]) -> serde_json::Value {
    let inner = shapes[rng.gen_range(0..shapes.len())];
    let outer = shapes[rng.gen_range(0..shapes.len())];
    let speed0 = rng.gen_range(0.005..0.015);
    let speed1 = rng.gen_range(-0.008..-0.002);
    json!({
        "type": "composite",
        "pattern": "nested",
        "bodies": [
            random_body(rng, inner, 0.6),
            random_body_with_opacity(rng, outer, 1.4, 0.3, 0.5),
        ],
        "orbits": [],
        "rotations": [
            { "body": 0, "speed": speed0, "axis": random_axis(rng) },
            { "body": 1, "speed": speed1, "axis": random_axis(rng) },
        ]
    })
}

fn build_crowned(rng: &mut impl Rng, shapes: &[&str]) -> serde_json::Value {
    // Solid shapes only for center (not torus/moebius which look odd as center)
    let solid_shapes: Vec<&&str> = shapes.iter().filter(|s| !["torus", "moebius", "torus_knot"].contains(s)).collect();
    let center = if solid_shapes.is_empty() { shapes[0] } else { solid_shapes[rng.gen_range(0..solid_shapes.len())] };
    let speed0 = rng.gen_range(0.005..0.015);
    let speed1 = rng.gen_range(-0.01..-0.004);
    // Ring is always a torus
    json!({
        "type": "composite",
        "pattern": "crowned",
        "bodies": [
            random_body(rng, center, 0.7),
            random_body_with_opacity(rng, "torus", 1.3, 0.4, 0.6),
        ],
        "orbits": [],
        "rotations": [
            { "body": 0, "speed": speed0, "axis": [0, 1, 0] },
            { "body": 1, "speed": speed1, "axis": random_axis(rng) },
        ]
    })
}

fn build_binary(rng: &mut impl Rng, shapes: &[&str]) -> serde_json::Value {
    let s0 = shapes[rng.gen_range(0..shapes.len())];
    let s1 = shapes[rng.gen_range(0..shapes.len())];
    let orbit_speed = rng.gen_range(0.005..0.015);
    let radius = rng.gen_range(0.8..1.5);
    let orbit_axis = random_axis(rng);
    json!({
        "type": "composite",
        "pattern": "binary",
        "bodies": [
            random_body(rng, s0, 0.6),
            random_body(rng, s1, 0.6),
        ],
        "orbits": [
            { "body": 0, "center": [0,0,0], "axis": orbit_axis, "speed": orbit_speed, "direction": 1, "radius": radius, "phase": 0 },
            { "body": 1, "center": [0,0,0], "axis": orbit_axis, "speed": orbit_speed, "direction": 1, "radius": radius, "phase": 180 },
        ],
        "rotations": [
            { "body": 0, "speed": rng.gen_range(0.008..0.02), "axis": random_axis(rng) },
            { "body": 1, "speed": rng.gen_range(0.008..0.02), "axis": random_axis(rng) },
        ]
    })
}

fn build_axis(rng: &mut impl Rng, shapes: &[&str]) -> serde_json::Value {
    let n_bodies: usize = if rng.gen_bool(0.5) { 2 } else { 3 };
    let spacing = rng.gen_range(0.8..1.2);
    let shared_axis = random_axis(rng);

    let mut bodies = Vec::new();
    let mut rotations = Vec::new();

    for i in 0..n_bodies {
        let s = shapes[rng.gen_range(0..shapes.len())];
        bodies.push(random_body(rng, s, 0.5));
        rotations.push(json!({
            "body": i,
            "speed": rng.gen_range(0.008..0.025) * if rng.gen_bool(0.3) { -1.0 } else { 1.0 },
            "axis": shared_axis
        }));
    }

    // Orbits position the bodies along the axis — use small radius at different phases
    // Actually, for axis pattern, bodies are stacked along an axis. We encode position via orbit.
    let mut orbits = Vec::new();
    for i in 0..n_bodies {
        let offset = (i as f64 - (n_bodies as f64 - 1.0) / 2.0) * spacing;
        orbits.push(json!({
            "body": i,
            "center": [
                shared_axis[0].as_f64().unwrap_or(0.0) * offset,
                shared_axis[1].as_f64().unwrap_or(1.0) * offset,
                shared_axis[2].as_f64().unwrap_or(0.0) * offset
            ],
            "axis": [0, 0, 0],
            "speed": 0,
            "direction": 1,
            "radius": 0,
            "phase": 0
        }));
    }

    json!({
        "type": "composite",
        "pattern": "axis",
        "bodies": bodies,
        "orbits": orbits,
        "rotations": rotations
    })
}

// ─── Voice generation ────────────────────────────────────────────────────────

fn generate_voice(rng: &mut impl Rng, rank: &str) -> serde_json::Value {
    match rank {
        "minor" => json!({
            "baseFrequency": rng.gen_range(280.0..400.0),
            "formants": [
                rng.gen_range(700.0..900.0),
                rng.gen_range(1200.0..1600.0),
                rng.gen_range(2800.0..3600.0),
            ],
            "breathiness": rng.gen_range(0.1..0.25),
            "speed": rng.gen_range(1.2..1.6)
        }),
        "major" => json!({
            "baseFrequency": rng.gen_range(140.0..200.0),
            "formants": [
                rng.gen_range(450.0..550.0),
                rng.gen_range(1000.0..1400.0),
                rng.gen_range(2500.0..3100.0),
            ],
            "breathiness": rng.gen_range(0.2..0.4),
            "speed": rng.gen_range(0.9..1.1)
        }),
        _ => json!({
            "baseFrequency": rng.gen_range(70.0..110.0),
            "formants": [
                rng.gen_range(250.0..350.0),
                rng.gen_range(700.0..900.0),
                rng.gen_range(2000.0..2400.0),
            ],
            "breathiness": rng.gen_range(0.3..0.6),
            "speed": rng.gen_range(0.5..0.8)
        }),
    }
}

// ─── Weighted selection helpers ──────────────────────────────────────────────

/// Pick a shape with weight inversely proportional to usage in the registry.
fn weighted_pick<'a>(
    rng: &mut impl Rng,
    catalog: &[&'a str],
    rank_entries: &[&RegistryEntry],
) -> &'a str {
    let counts: Vec<usize> = catalog
        .iter()
        .map(|shape| {
            rank_entries
                .iter()
                .filter(|e| e.body_shapes.contains(&shape.to_string()))
                .count()
        })
        .collect();

    let max_count = counts.iter().copied().max().unwrap_or(0) + 1;
    let weights: Vec<f64> = counts.iter().map(|c| (max_count - c) as f64).collect();
    let total: f64 = weights.iter().sum();

    if total <= 0.0 {
        return catalog[rng.gen_range(0..catalog.len())];
    }

    let mut roll = rng.gen_range(0.0..total);
    for (i, w) in weights.iter().enumerate() {
        roll -= w;
        if roll <= 0.0 {
            return catalog[i];
        }
    }
    catalog[catalog.len() - 1]
}

/// Pick a prince pattern with weight inversely proportional to usage.
fn weighted_pattern_pick<'a>(
    rng: &mut impl Rng,
    rank_entries: &[&RegistryEntry],
) -> &'a str {
    let counts: Vec<usize> = PRINCE_PATTERNS
        .iter()
        .map(|p| {
            rank_entries
                .iter()
                .filter(|e| e.pattern.as_deref() == Some(p))
                .count()
        })
        .collect();

    let max_count = counts.iter().copied().max().unwrap_or(0) + 1;
    let weights: Vec<f64> = counts.iter().map(|c| (max_count - c) as f64).collect();
    let total: f64 = weights.iter().sum();

    if total <= 0.0 {
        return PRINCE_PATTERNS[rng.gen_range(0..PRINCE_PATTERNS.len())];
    }

    let mut roll = rng.gen_range(0.0..total);
    for (i, w) in weights.iter().enumerate() {
        roll -= w;
        if roll <= 0.0 {
            return PRINCE_PATTERNS[i];
        }
    }
    PRINCE_PATTERNS[PRINCE_PATTERNS.len() - 1]
}

// ─── Color generation with repulsion ─────────────────────────────────────────

fn generate_repulsed_color(rng: &mut impl Rng, rank_entries: &[&RegistryEntry]) -> [f64; 3] {
    let existing: Vec<[f64; 3]> = rank_entries.iter().map(|e| e.primary_color_hsl).collect();

    if existing.is_empty() {
        return random_color(rng);
    }

    // Generate N candidates and pick the one with max min-distance
    let n_candidates = 20;
    let mut best = random_color(rng);
    let mut best_dist = min_distance(&best, &existing);

    for _ in 1..n_candidates {
        let candidate = random_color(rng);
        let dist = min_distance(&candidate, &existing);
        if dist > best_dist {
            best = candidate;
            best_dist = dist;
        }
    }

    best
}

fn random_color(rng: &mut impl Rng) -> [f64; 3] {
    [
        rng.gen_range(0.0..360.0),
        rng.gen_range(30.0..80.0),
        rng.gen_range(25.0..55.0),
    ]
}

fn min_distance(color: &[f64; 3], existing: &[[f64; 3]]) -> f64 {
    existing
        .iter()
        .map(|e| hsl_distance(color, e))
        .fold(f64::MAX, f64::min)
}

fn hsl_distance(a: &[f64; 3], b: &[f64; 3]) -> f64 {
    // Hue is circular — use shortest arc
    let dh = {
        let raw = (a[0] - b[0]).abs();
        let wrapped = if raw > 180.0 { 360.0 - raw } else { raw };
        wrapped / 360.0 // normalize to [0, 1]
    };
    let ds = (a[1] - b[1]) / 100.0;
    let dl = (a[2] - b[2]) / 100.0;
    (dh * dh + ds * ds + dl * dl).sqrt()
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

fn random_rotation(rng: &mut impl Rng, min_speed: f64, max_speed: f64) -> serde_json::Value {
    json!({
        "speed": rng.gen_range(min_speed..max_speed),
        "axis": random_axis(rng)
    })
}

fn random_axis(rng: &mut impl Rng) -> serde_json::Value {
    let x: f64 = rng.gen_range(-1.0..1.0);
    let y: f64 = rng.gen_range(-1.0..1.0);
    let z: f64 = rng.gen_range(-1.0..1.0);
    let len = (x * x + y * y + z * z).sqrt().max(0.001);
    json!([x / len, y / len, z / len])
}

fn random_body(rng: &mut impl Rng, shape: &str, scale: f64) -> serde_json::Value {
    let hsl = random_color(rng);
    let hex = hsl_to_hex(hsl);
    let mut body = json!({
        "shape": shape,
        "scale": scale + rng.gen_range(-0.1..0.1),
        "color": { "base": hex, "variance": rng.gen_range(0.1..0.3) },
        "opacity": rng.gen_range(0.5..0.9)
    });
    if let Some(params) = major_params(rng, shape) {
        body["params"] = params;
    }
    body
}

fn random_body_with_opacity(
    rng: &mut impl Rng,
    shape: &str,
    scale: f64,
    min_opacity: f64,
    max_opacity: f64,
) -> serde_json::Value {
    let hsl = random_color(rng);
    let hex = hsl_to_hex(hsl);
    let mut body = json!({
        "shape": shape,
        "scale": scale + rng.gen_range(-0.1..0.1),
        "color": { "base": hex, "variance": rng.gen_range(0.1..0.3) },
        "opacity": rng.gen_range(min_opacity..max_opacity)
    });
    if let Some(params) = major_params(rng, shape) {
        body["params"] = params;
    }
    body
}

// ─── Color conversion ────────────────────────────────────────────────────────

fn hsl_to_hex(hsl: [f64; 3]) -> String {
    let h = hsl[0] / 360.0;
    let s = hsl[1] / 100.0;
    let l = hsl[2] / 100.0;

    let (r, g, b) = if s < f64::EPSILON {
        (l, l, l)
    } else {
        let q = if l < 0.5 { l * (1.0 + s) } else { l + s - l * s };
        let p = 2.0 * l - q;
        (
            hue_to_rgb(p, q, h + 1.0 / 3.0),
            hue_to_rgb(p, q, h),
            hue_to_rgb(p, q, h - 1.0 / 3.0),
        )
    };

    format!(
        "#{:02x}{:02x}{:02x}",
        (r * 255.0).round() as u8,
        (g * 255.0).round() as u8,
        (b * 255.0).round() as u8,
    )
}

fn hue_to_rgb(p: f64, q: f64, mut t: f64) -> f64 {
    if t < 0.0 { t += 1.0; }
    if t > 1.0 { t -= 1.0; }
    if t < 1.0 / 6.0 { return p + (q - p) * 6.0 * t; }
    if t < 1.0 / 2.0 { return q; }
    if t < 2.0 / 3.0 { return p + (q - p) * (2.0 / 3.0 - t) * 6.0; }
    p
}

fn hex_to_hsl(hex: &str) -> [f64; 3] {
    let hex = hex.trim_start_matches('#');
    if hex.len() < 6 {
        return [0.0, 50.0, 50.0];
    }
    let r = u8::from_str_radix(&hex[0..2], 16).unwrap_or(128) as f64 / 255.0;
    let g = u8::from_str_radix(&hex[2..4], 16).unwrap_or(128) as f64 / 255.0;
    let b = u8::from_str_radix(&hex[4..6], 16).unwrap_or(128) as f64 / 255.0;

    let max = r.max(g).max(b);
    let min = r.min(g).min(b);
    let l = (max + min) / 2.0;

    if (max - min).abs() < f64::EPSILON {
        return [0.0, 0.0, l * 100.0];
    }

    let d = max - min;
    let s = if l > 0.5 { d / (2.0 - max - min) } else { d / (max + min) };
    let h = if (max - r).abs() < f64::EPSILON {
        ((g - b) / d + if g < b { 6.0 } else { 0.0 }) / 6.0
    } else if (max - g).abs() < f64::EPSILON {
        ((b - r) / d + 2.0) / 6.0
    } else {
        ((r - g) / d + 4.0) / 6.0
    };

    [h * 360.0, s * 100.0, l * 100.0]
}

/// Generate a manifest for debug preview (not persisted in registry).
pub fn generate_debug_manifest(rank: &str, registry: &[RegistryEntry]) -> DemonManifest {
    generate_manifest(rank, registry)
}
