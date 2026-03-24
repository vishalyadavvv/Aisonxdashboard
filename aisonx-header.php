<?php
/**
 * The header for the Sinatra theme - AISONX Custom
 */
?>
<!DOCTYPE html>
<html <?php language_attributes(); ?>>
<head>
    <meta charset="<?php bloginfo('charset'); ?>">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <?php wp_head(); ?>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Space+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <style>
        :root {
            --aisonx-primary: #6366f1;
            --aisonx-accent: #06b6d4;
            --aisonx-dark: #0f172a;
            --aisonx-white: #ffffff;
            --aisonx-gradient-1: linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #06b6d4 100%);
            --aisonx-transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        }

        /* ==============================
           FIX 1: Always dark background
           ============================== */
        .aisonx-nav {
            position: fixed;
            top: 0; left: 0; right: 0;
            z-index: 1001;
            padding: 16px 0;
            transition: var(--aisonx-transition);
            /* FORCE dark background — prevent theme override */
            background: rgba(15, 23, 42, 0.95) !important;
            backdrop-filter: blur(20px);
            -webkit-backdrop-filter: blur(20px);
            box-shadow: 0 1px 0 rgba(255,255,255,0.08);
            font-family: 'Inter', sans-serif;
        }
        /* On scroll: slightly more opaque + stronger shadow */
        .aisonx-nav-scrolled {
            background: rgba(10, 15, 28, 0.98) !important;
            box-shadow: 0 4px 24px rgba(0,0,0,0.4) !important;
            padding: 12px 0 !important;
        }

        /* ==============================
           FIX 2: Proper flex layout
           so links are always centered
           ============================== */
        .aisonx-nav-container {
            max-width: 1280px;
            margin: 0 auto;
            padding: 0 32px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 20px;
        }

        /* Logo — left */
        .aisonx-logo {
            font-family: 'Space Grotesk', sans-serif;
            font-size: 26px;
            font-weight: 800;
            text-decoration: none;
            color: var(--aisonx-white);
            flex-shrink: 0;
            letter-spacing: 0.5px;
        }

        /* Nav links — center (takes remaining space) */
        .aisonx-nav-links {
            display: flex;
            align-items: center;
            gap: 32px;
            list-style: none;
            margin: 0; padding: 0;
            flex: 1;
            justify-content: center; /* CENTER the links */
        }
        .aisonx-nav-links li { position: relative; }
        .aisonx-nav-links > li > a {
            text-decoration: none;
            color: rgba(255,255,255,0.85);
            font-weight: 500;
            font-size: 14px;
            transition: var(--aisonx-transition);
            position: relative;
            white-space: nowrap;
        }
        .aisonx-nav-links > li > a::after {
            content: '';
            position: absolute;
            bottom: -4px; left: 0;
            width: 0; height: 2px;
            background: var(--aisonx-gradient-1);
            transition: var(--aisonx-transition);
        }
        .aisonx-nav-links > li > a:hover { color: var(--aisonx-white); }
        .aisonx-nav-links > li > a:hover::after { width: 100%; }

        /* Right side: CTA buttons */
        .aisonx-nav-right {
            display: flex;
            align-items: center;
            gap: 12px;
            flex-shrink: 0;
        }

        /* ---- DROPDOWN ---- */
        .aisonx-dropdown-menu {
            position: absolute;
            top: calc(100% + 12px); left: 50%;
            transform: translateX(-50%);
            background: rgba(10, 15, 28, 0.98);
            backdrop-filter: blur(20px);
            min-width: 230px;
            border-radius: 10px;
            padding: 10px 0;
            box-shadow: 0 20px 40px rgba(0,0,0,0.4);
            opacity: 0; visibility: hidden;
            transition: var(--aisonx-transition);
            z-index: 1002;
            border: 1px solid rgba(255,255,255,0.08);
            list-style: none; margin: 0;
        }
        .aisonx-nav-links li:hover > .aisonx-dropdown-menu {
            opacity: 1; visibility: visible;
        }
        .aisonx-dropdown-menu li { padding: 0; }
        .aisonx-dropdown-menu a {
            display: block;
            padding: 9px 20px;
            color: rgba(255,255,255,0.75) !important;
            font-size: 13px; font-weight: 500;
            white-space: nowrap;
            text-decoration: none;
            transition: var(--aisonx-transition);
        }
        .aisonx-dropdown-menu a::after { display: none !important; }
        .aisonx-dropdown-menu a:hover {
            background: rgba(99,102,241,0.15);
            color: var(--aisonx-white) !important;
            padding-left: 26px;
        }

        /* ---- HIGHLIGHT PILL ---- */
        .aisonx-nav-highlight {
            background: var(--aisonx-gradient-1) !important;
            color: var(--aisonx-white) !important;
            padding: 9px 18px !important;
            border-radius: 50px !important;
            font-weight: 600 !important;
            font-size: 14px !important;
            display: inline-flex !important;
            align-items: center;
            gap: 6px;
            box-shadow: 0 4px 14px rgba(99,102,241,0.4);
            white-space: nowrap;
        }
        .aisonx-nav-highlight:hover {
            transform: translateY(-2px) !important;
            box-shadow: 0 6px 20px rgba(99,102,241,0.5) !important;
        }
        .aisonx-nav-highlight::after { display: none !important; }
        .aisonx-dropdown-trigger i {
            font-size: 10px;
            transition: transform 0.3s ease;
        }
        .aisonx-nav-links li:hover .aisonx-dropdown-trigger i {
            transform: rotate(180deg);
        }

        /* ---- CTA BUTTON ---- */
        .aisonx-btn {
            display: inline-flex; align-items: center;
            justify-content: center; gap: 8px;
            padding: 10px 22px; border-radius: 50px;
            font-weight: 600; font-size: 14px;
            text-decoration: none;
            transition: var(--aisonx-transition);
            cursor: pointer; border: none;
            font-family: 'Inter', sans-serif;
            white-space: nowrap;
        }
        .aisonx-btn-primary {
            background: linear-gradient(135deg, #7c3aed, #6366f1);
            color: var(--aisonx-white);
            box-shadow: 0 4px 14px rgba(99,102,241,0.35);
        }
        .aisonx-btn-primary:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 20px rgba(99,102,241,0.5);
            color: var(--aisonx-white);
        }

        /* ---- MOBILE TOGGLE ---- */
        .aisonx-mobile-toggle {
            display: none;
            flex-direction: column;
            gap: 5px; cursor: pointer; padding: 8px;
            border-radius: 6px;
        }
        .aisonx-mobile-toggle span {
            width: 22px; height: 2px;
            background: var(--aisonx-white);
            border-radius: 2px;
            transition: var(--aisonx-transition);
            display: block;
        }

        /* ---- MOBILE NAV ---- */
        .aisonx-mobile-nav {
            position: fixed;
            top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(10, 15, 28, 0.99);
            z-index: 2000;
            padding: 80px 32px 40px;
            display: flex; flex-direction: column; gap: 8px;
            opacity: 0; visibility: hidden;
            transform: translateY(-10px);
            transition: all 0.35s cubic-bezier(0.165, 0.84, 0.44, 1);
            pointer-events: none;
            font-family: 'Inter', sans-serif;
            overflow-y: auto;
        }
        .aisonx-mobile-nav.aisonx-active {
            opacity: 1; visibility: visible;
            transform: translateY(0); pointer-events: auto;
        }
        .aisonx-mobile-nav > a,
        .aisonx-mobile-nav > div > span {
            font-size: 17px; font-weight: 500;
            color: rgba(255,255,255,0.85);
            text-decoration: none;
            padding: 12px 0;
            border-bottom: 1px solid rgba(255,255,255,0.07);
            display: block;
            transition: color 0.2s;
        }
        .aisonx-mobile-nav > a:hover { color: var(--aisonx-white); }
        .aisonx-mobile-close {
            position: absolute; top: 20px; right: 24px;
            font-size: 24px; cursor: pointer;
            color: rgba(255,255,255,0.7);
            width: 36px; height: 36px;
            display: flex; align-items: center; justify-content: center;
            border-radius: 50%;
            background: rgba(255,255,255,0.08);
            transition: background 0.2s;
        }
        .aisonx-mobile-close:hover { background: rgba(255,255,255,0.15); }
        .aisonx-mobile-dropdown {
            display: flex; flex-direction: column;
            padding: 8px 0 8px 16px;
            border-left: 2px solid #6366f1;
            margin-top: 8px; gap: 4px;
        }
        .aisonx-mobile-dropdown a {
            font-size: 14px !important;
            color: rgba(255,255,255,0.65) !important;
            text-decoration: none;
            padding: 8px 0 !important;
            border: none !important;
            display: block;
        }
        .aisonx-mobile-dropdown a:hover { color: rgba(255,255,255,0.95) !important; }

        /* ---- RESPONSIVE ---- */
        @media (max-width: 1024px) {
            .aisonx-nav-links { gap: 20px; }
            .aisonx-nav-links > li > a { font-size: 13px; }
        }
        @media (max-width: 900px) {
            .aisonx-nav-links { display: none; }
            .aisonx-mobile-toggle { display: flex; }
            .aisonx-nav-right .aisonx-btn { display: none; }
        }

        /* Body offset so content doesn't hide under nav */
        body { padding-top: 64px !important; }
        .admin-bar .aisonx-nav { top: 32px; }
        @media (max-width: 782px) { .admin-bar .aisonx-nav { top: 46px; } }
    </style>
</head>
<body <?php body_class(); ?>>
<?php wp_body_open(); ?>

<!-- AISONX Navigation -->
<nav class="aisonx-nav" id="aisonxNav">
    <div class="aisonx-nav-container">

        <!-- Logo -->
        <a href="<?php echo esc_url( home_url('/') ); ?>" class="aisonx-logo">AISONX</a>

        <!-- Center Nav Links -->
        <ul class="aisonx-nav-links">
            <li><a href="<?php echo esc_url( home_url('/#features') ); ?>">Features</a></li>
            <li><a href="<?php echo esc_url( home_url('/#why') ); ?>">Why AI Visibility</a></li>
            <li><a href="<?php echo esc_url( home_url('/#solutions') ); ?>">Solutions</a></li>
            <li><a href="<?php echo esc_url( home_url('/#industries') ); ?>">Industries</a></li>
            <li><a href="<?php echo esc_url( home_url('/aisonx-pricing-packages/') ); ?>">Packages</a></li>
            <li class="aisonx-has-dropdown">
                <a href="javascript:void(0)" class="aisonx-dropdown-trigger aisonx-nav-highlight">
                    Check Your AI Visibility <i class="fas fa-chevron-down"></i>
                </a>
                <ul class="aisonx-dropdown-menu">
                    <li><a href="<?php echo esc_url( home_url('/aisonx-check-brand-visibility/') ); ?>">Check LLM Entity Visibility</a></li>
                    <li><a href="<?php echo esc_url( home_url('/ai-web-search/') ); ?>">Check LLM Live Visibility</a></li>
                    <li><a href="<?php echo esc_url( home_url('/ai-audit-tool/') ); ?>">AI Visibility Audit Tool</a></li>
                    <li><a href="<?php echo esc_url( home_url('/ai-domain-analyzer/') ); ?>">AI Domain Analyser</a></li>
                    <li><a href="<?php echo esc_url( home_url('/google-knowledge-graph-explorer/') ); ?>">Brand Authority Score</a></li>
                </ul>
            </li>
        </ul>

        <!-- Right: Contact CTA + Mobile Toggle -->
        <div class="aisonx-nav-right">
            <a href="<?php echo esc_url( home_url('/contact-aisonx/') ); ?>" class="aisonx-btn aisonx-btn-primary">
                Contact Us
            </a>
            <div class="aisonx-mobile-toggle" id="aisonxMobileToggle">
                <span></span><span></span><span></span>
            </div>
        </div>

    </div>
</nav>

<!-- Mobile Navigation -->
<div class="aisonx-mobile-nav" id="aisonxMobileNav">
    <div class="aisonx-mobile-close" id="aisonxMobileClose">
        <i class="fas fa-times"></i>
    </div>
    <a href="<?php echo esc_url( home_url('/#features') ); ?>">Features</a>
    <a href="<?php echo esc_url( home_url('/#why') ); ?>">Why AI Visibility</a>
    <a href="<?php echo esc_url( home_url('/#solutions') ); ?>">Solutions</a>
    <a href="<?php echo esc_url( home_url('/#industries') ); ?>">Industries</a>
    <a href="<?php echo esc_url( home_url('/aisonx-pricing-packages/') ); ?>">Packages</a>
    <div>
        <span style="font-size:14px;font-weight:600;color:rgba(255,255,255,0.5);text-transform:uppercase;letter-spacing:1px;display:block;padding:12px 0 4px;">Check Your AI Visibility</span>
        <div class="aisonx-mobile-dropdown">
            <a href="<?php echo esc_url( home_url('/aisonx-check-brand-visibility/') ); ?>">Check LLM Entity Visibility</a>
            <a href="<?php echo esc_url( home_url('/ai-web-search/') ); ?>">Check LLM Live Visibility</a>
            <a href="<?php echo esc_url( home_url('/ai-audit-tool/') ); ?>">AI Visibility Audit Tool</a>
            <a href="<?php echo esc_url( home_url('/ai-domain-analyzer/') ); ?>">AI Domain Analyser</a>
            <a href="<?php echo esc_url( home_url('/google-knowledge-graph-explorer/') ); ?>">Brand Authority Score</a>
        </div>
    </div>
    <div style="margin-top:16px;">
        <a href="<?php echo esc_url( home_url('/contact-aisonx/') ); ?>" class="aisonx-btn aisonx-btn-primary" style="width:100%;justify-content:center;">Contact Us</a>
    </div>
</div>

<script>
(function() {
    document.addEventListener('DOMContentLoaded', function() {
        var nav    = document.getElementById('aisonxNav');
        var toggle = document.getElementById('aisonxMobileToggle');
        var mob    = document.getElementById('aisonxMobileNav');
        var close  = document.getElementById('aisonxMobileClose');

        // Scroll: add/remove scrolled class
        if (nav) {
            window.addEventListener('scroll', function() {
                nav.classList.toggle('aisonx-nav-scrolled', window.scrollY > 50);
            }, { passive: true });
        }

        // Mobile open/close
        if (toggle && mob) {
            toggle.addEventListener('click', function() { mob.classList.add('aisonx-active'); document.body.style.overflow = 'hidden'; });
        }
        if (close && mob) {
            close.addEventListener('click',  function() { mob.classList.remove('aisonx-active'); document.body.style.overflow = ''; });
        }

        // Close on link tap
        if (mob) {
            mob.querySelectorAll('a').forEach(function(a) {
                a.addEventListener('click', function() { mob.classList.remove('aisonx-active'); document.body.style.overflow = ''; });
            });
        }
    });
})();
</script>

<!-- Page Wrapper -->
<div id="page" class="site">
    <div id="content" class="site-content">