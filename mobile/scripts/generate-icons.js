const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const ASSETS_DIR = path.join(__dirname, '..', 'assets');

// Green gradient colors for agriculture theme
const BRAND_GREEN = '#15803d';
const LIGHT_GREEN = '#22c55e';
const DARK_GREEN = '#166534';

async function createGradientBackground(size, style = 'radial') {
  // Create a radial gradient SVG
  let svg;

  if (style === 'radial') {
    // Radial gradient from center - lighter to darker
    svg = `
      <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <radialGradient id="grad" cx="50%" cy="40%" r="70%">
            <stop offset="0%" style="stop-color:${LIGHT_GREEN};stop-opacity:1" />
            <stop offset="50%" style="stop-color:${BRAND_GREEN};stop-opacity:1" />
            <stop offset="100%" style="stop-color:${DARK_GREEN};stop-opacity:1" />
          </radialGradient>
        </defs>
        <rect width="100%" height="100%" fill="url(#grad)"/>
      </svg>
    `;
  } else if (style === 'diagonal') {
    // Diagonal gradient
    svg = `
      <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:${LIGHT_GREEN};stop-opacity:1" />
            <stop offset="50%" style="stop-color:${BRAND_GREEN};stop-opacity:1" />
            <stop offset="100%" style="stop-color:${DARK_GREEN};stop-opacity:1" />
          </linearGradient>
        </defs>
        <rect width="100%" height="100%" fill="url(#grad)"/>
      </svg>
    `;
  } else if (style === 'mesh') {
    // Mesh gradient with subtle pattern
    svg = `
      <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <radialGradient id="grad1" cx="20%" cy="20%" r="50%">
            <stop offset="0%" style="stop-color:${LIGHT_GREEN};stop-opacity:0.8" />
            <stop offset="100%" style="stop-color:${BRAND_GREEN};stop-opacity:0" />
          </radialGradient>
          <radialGradient id="grad2" cx="80%" cy="80%" r="60%">
            <stop offset="0%" style="stop-color:#34d399;stop-opacity:0.6" />
            <stop offset="100%" style="stop-color:${BRAND_GREEN};stop-opacity:0" />
          </radialGradient>
          <radialGradient id="grad3" cx="70%" cy="30%" r="40%">
            <stop offset="0%" style="stop-color:#4ade80;stop-opacity:0.4" />
            <stop offset="100%" style="stop-color:${BRAND_GREEN};stop-opacity:0" />
          </radialGradient>
        </defs>
        <rect width="100%" height="100%" fill="${BRAND_GREEN}"/>
        <rect width="100%" height="100%" fill="url(#grad1)"/>
        <rect width="100%" height="100%" fill="url(#grad2)"/>
        <rect width="100%" height="100%" fill="url(#grad3)"/>
      </svg>
    `;
  }

  return Buffer.from(svg);
}

// Create an SVG plant/seedling icon that scales perfectly
function createPlantIconSvg(size) {
  const scale = size / 1024;
  // A stylized plant/seedling icon - represents agriculture/farming
  const svg = `
    <svg width="${size}" height="${size}" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
      <!-- Main seedling/plant shape -->
      <g fill="#FFFFFF">
        <!-- Stem -->
        <rect x="480" y="420" width="64" height="320" rx="32" ry="32"/>

        <!-- Left leaf -->
        <path d="M512 450 C350 350 280 280 280 200 C280 150 350 120 400 140 C450 160 512 250 512 350 Z" />

        <!-- Right leaf -->
        <path d="M512 450 C674 350 744 280 744 200 C744 150 674 120 624 140 C574 160 512 250 512 350 Z" />

        <!-- Soil/ground curve -->
        <ellipse cx="512" cy="750" rx="200" ry="40"/>

        <!-- Small roots peeking -->
        <path d="M460 740 Q450 780 430 800" stroke="#FFFFFF" stroke-width="16" fill="none" stroke-linecap="round"/>
        <path d="M564 740 Q574 780 594 800" stroke="#FFFFFF" stroke-width="16" fill="none" stroke-linecap="round"/>
      </g>
    </svg>
  `;
  return Buffer.from(svg);
}

// Create a chat bubble with plant icon (representing FarmerChat)
function createFarmerChatIconSvg(size) {
  const svg = `
    <svg width="${size}" height="${size}" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
      <g fill="#FFFFFF">
        <!-- Chat bubble -->
        <path d="M200 250
                 L824 250
                 Q874 250 874 300
                 L874 600
                 Q874 650 824 650
                 L600 650
                 L512 750
                 L424 650
                 L200 650
                 Q150 650 150 600
                 L150 300
                 Q150 250 200 250 Z" />

        <!-- Leaf inside bubble -->
        <g fill="${BRAND_GREEN}">
          <path d="M512 360 C420 310 370 270 370 210 C370 170 420 150 460 165 C500 180 512 240 512 320 Z" />
          <path d="M512 360 C604 310 654 270 654 210 C654 170 604 150 564 165 C524 180 512 240 512 320 Z" />
          <rect x="496" y="350" width="32" height="180" rx="16" ry="16"/>
        </g>
      </g>
    </svg>
  `;
  return Buffer.from(svg);
}

async function createIconWithLeafPattern(size) {
  // Create abstract leaf/plant pattern
  const svg = `
    <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="bg" cx="50%" cy="35%" r="70%">
          <stop offset="0%" style="stop-color:${LIGHT_GREEN}" />
          <stop offset="100%" style="stop-color:${DARK_GREEN}" />
        </radialGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#bg)"/>

      <!-- Abstract leaf shapes in background -->
      <g opacity="0.15">
        <ellipse cx="${size * 0.15}" cy="${size * 0.85}" rx="${size * 0.2}" ry="${size * 0.1}" fill="#ffffff" transform="rotate(-30 ${size * 0.15} ${size * 0.85})"/>
        <ellipse cx="${size * 0.85}" cy="${size * 0.15}" rx="${size * 0.15}" ry="${size * 0.08}" fill="#ffffff" transform="rotate(45 ${size * 0.85} ${size * 0.15})"/>
        <ellipse cx="${size * 0.9}" cy="${size * 0.7}" rx="${size * 0.12}" ry="${size * 0.06}" fill="#ffffff" transform="rotate(-60 ${size * 0.9} ${size * 0.7})"/>
        <ellipse cx="${size * 0.1}" cy="${size * 0.3}" rx="${size * 0.1}" ry="${size * 0.05}" fill="#ffffff" transform="rotate(30 ${size * 0.1} ${size * 0.3})"/>
      </g>

      <!-- Subtle geometric pattern -->
      <g opacity="0.08">
        <circle cx="${size * 0.2}" cy="${size * 0.2}" r="${size * 0.08}" fill="#ffffff"/>
        <circle cx="${size * 0.8}" cy="${size * 0.8}" r="${size * 0.1}" fill="#ffffff"/>
        <circle cx="${size * 0.7}" cy="${size * 0.25}" r="${size * 0.05}" fill="#ffffff"/>
      </g>
    </svg>
  `;

  return Buffer.from(svg);
}

async function generateIcons() {
  console.log('🎨 Generating app icons with interesting backgrounds...\n');

  // Use highest resolution logo available
  const logo3xPath = path.join(ASSETS_DIR, 'logo@3x.png');
  const logoPath = fs.existsSync(logo3xPath)
    ? logo3xPath
    : path.join(ASSETS_DIR, 'logo.png');

  if (!fs.existsSync(logoPath)) {
    console.error('❌ logo.png not found in assets');
    return;
  }

  // Read logo metadata to understand its size
  const logoMeta = await sharp(logoPath).metadata();
  console.log(`📷 Using logo: ${path.basename(logoPath)} (${logoMeta.width}x${logoMeta.height})`);

  // Generate different icon sizes
  const iconConfigs = [
    { name: 'icon.png', size: 1024, style: 'mesh', useSvgIcon: 'chat', logoScale: 0.55 },
    { name: 'adaptive-icon.png', size: 1024, style: 'radial', useSvgIcon: 'chat', logoScale: 0.5 },
    { name: 'splash-icon.png', size: 512, style: 'radial', useSvgIcon: 'chat', logoScale: 0.6, transparent: true },
  ];

  for (const config of iconConfigs) {
    console.log(`\n🔄 Creating ${config.name}...`);

    try {
      // Create background
      let background;
      if (config.transparent) {
        // Transparent background for splash
        background = await sharp({
          create: {
            width: config.size,
            height: config.size,
            channels: 4,
            background: { r: 0, g: 0, b: 0, alpha: 0 }
          }
        }).png().toBuffer();
      } else if (config.style === 'leaf') {
        background = await createIconWithLeafPattern(config.size);
        background = await sharp(background).png().toBuffer();
      } else {
        background = await createGradientBackground(config.size, config.style);
        background = await sharp(background).png().toBuffer();
      }

      // Get foreground icon - either SVG or PNG logo
      let foregroundIcon;
      const iconSize = Math.round(config.size * config.logoScale);

      if (config.useSvgIcon === 'chat') {
        // Use the SVG chat-with-plant icon (scales perfectly)
        const svgIcon = createFarmerChatIconSvg(iconSize);
        foregroundIcon = await sharp(svgIcon).png().toBuffer();
      } else if (config.useSvgIcon === 'plant') {
        // Use the SVG plant icon
        const svgIcon = createPlantIconSvg(iconSize);
        foregroundIcon = await sharp(svgIcon).png().toBuffer();
      } else {
        // Use PNG logo (may be blurry at large sizes)
        foregroundIcon = await sharp(logoPath)
          .resize(iconSize, iconSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
          .png()
          .toBuffer();
      }

      // Calculate position to center icon
      const offset = Math.round((config.size - iconSize) / 2);

      // Composite icon onto background
      await sharp(background)
        .composite([{
          input: foregroundIcon,
          top: offset,
          left: offset,
          blend: 'over'
        }])
        .png()
        .toFile(path.join(ASSETS_DIR, config.name));

      console.log(`✅ Created ${config.name}`);
    } catch (err) {
      console.error(`❌ Failed to create ${config.name}:`, err.message);
    }
  }

  // Also create themed versions for testing
  console.log('\n🎨 Creating alternate style icons...');

  const alternateConfigs = [
    { name: 'icon-leaf.png', bgStyle: 'leaf', iconStyle: 'chat' },
    { name: 'icon-diagonal.png', bgStyle: 'diagonal', iconStyle: 'chat' },
    { name: 'icon-plant.png', bgStyle: 'radial', iconStyle: 'plant' },
    { name: 'icon-plant-mesh.png', bgStyle: 'mesh', iconStyle: 'plant' },
  ];

  for (const alt of alternateConfigs) {
    try {
      // Create background
      let bg;
      if (alt.bgStyle === 'leaf') {
        bg = await createIconWithLeafPattern(1024);
      } else {
        bg = await createGradientBackground(1024, alt.bgStyle);
      }
      const bgPng = await sharp(bg).png().toBuffer();

      // Create foreground icon
      const iconSize = Math.round(1024 * 0.55);
      let foreground;
      if (alt.iconStyle === 'chat') {
        foreground = await sharp(createFarmerChatIconSvg(iconSize)).png().toBuffer();
      } else {
        foreground = await sharp(createPlantIconSvg(iconSize)).png().toBuffer();
      }

      const offset = Math.round((1024 - iconSize) / 2);

      await sharp(bgPng)
        .composite([{
          input: foreground,
          top: offset,
          left: offset,
          blend: 'over'
        }])
        .png()
        .toFile(path.join(ASSETS_DIR, alt.name));

      console.log(`✅ Created ${alt.name}`);
    } catch (err) {
      console.error(`❌ Failed to create ${alt.name}:`, err.message);
    }
  }

  console.log('\n✨ Icon generation complete!');
  console.log('📁 Icons saved to:', ASSETS_DIR);
  console.log('\nGenerated icons:');
  console.log('  📱 Main Icons (used by app):');
  console.log('     • icon.png - Main app icon (mesh gradient + chat bubble)');
  console.log('     • adaptive-icon.png - Android adaptive icon (radial gradient)');
  console.log('     • splash-icon.png - Splash screen (transparent bg)');
  console.log('\n  🎨 Alternate Designs (for testing):');
  console.log('     • icon-leaf.png - Leaf pattern background');
  console.log('     • icon-diagonal.png - Diagonal gradient');
  console.log('     • icon-plant.png - Plant/seedling icon');
  console.log('     • icon-plant-mesh.png - Plant icon with mesh gradient');
  console.log('\n  💡 To use an alternate icon, copy it to replace icon.png');
}


generateIcons().catch(console.error);
