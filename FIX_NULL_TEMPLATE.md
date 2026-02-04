# Fix: Template Rendering to Null

## The Problem

Your console shows:
```
Template rendered successfully: {{ states('input_text.current_background_image') }} -> null
Background image (raw): "null"
```

This means the entity `input_text.current_background_image` either:
1. **Doesn't exist**
2. **Exists but has no value set** (empty/null)
3. **Hasn't been initialized**

## The Solution

### Step 1: Check if Entity Exists

1. Go to **Developer Tools** → **States**
2. Search for: `input_text.current_background_image`
3. Does it appear in the list?

**If NO** - You need to create it (see Step 2)
**If YES** - Check its value (see Step 3)

### Step 2: Create the input_text Entity

Add to your `configuration.yaml`:

```yaml
input_text:
  current_background_image:
    name: Current Background Image
    initial: /local/backgrounds/tianshu-liu-aqZ3UAjs_M4-unsplash.jpg
    max: 255
```

**Or create via UI:**
1. Settings → Devices & Services → Helpers
2. Click **+ CREATE HELPER**
3. Select **Text**
4. Name: `Current Background Image`
5. Entity ID: `current_background_image`
6. Initial value: `/local/backgrounds/tianshu-liu-aqZ3UAjs_M4-unsplash.jpg`
7. Click **CREATE**

Then **restart Home Assistant**.

### Step 3: Set a Value

If the entity exists but is empty:

**Via UI:**
1. Go to **Developer Tools** → **Services**
2. Service: `input_text.set_value`
3. Entity: `input_text.current_background_image`
4. Value: `/local/backgrounds/tianshu-liu-aqZ3UAjs_M4-unsplash.jpg`
5. Click **CALL SERVICE**

**Via Automation:**
```yaml
service: input_text.set_value
target:
  entity_id: input_text.current_background_image
data:
  value: /local/backgrounds/tianshu-liu-aqZ3UAjs_M4-unsplash.jpg
```

**Via Template:**
```yaml
service: input_text.set_value
target:
  entity_id: input_text.current_background_image
data:
  value: >-
    {% if states('weather.home') == 'sunny' %}
      /local/backgrounds/sunny.jpg
    {% else %}
      /local/backgrounds/cloudy.jpg
    {% endif %}
```

### Step 4: Verify

After setting the value:
1. Go to **Developer Tools** → **States**
2. Find `input_text.current_background_image`
3. Verify it shows: `/local/backgrounds/tianshu-liu-aqZ3UAjs_M4-unsplash.jpg`

### Step 5: Reload Dashboard

1. **Hard refresh**: Ctrl+Shift+R (or Cmd+Shift+R)
2. Check console - should now show the actual path instead of "null"

## Alternative: Use a Different Entity

If you have another entity with the image path:

```yaml
# Use an input_select with predefined options
background_image: "{{ states('input_select.background_theme') }}"

# Or entity attribute
background_image: "{{ state_attr('weather.home', 'entity_picture') }}"

# Or sensor
background_image: "{{ states('sensor.background_url') }}"
```

## Temporary Fix: Use Static Path

While setting up the entity, use a static path:

```yaml
layout:
  # This works immediately
  background_image: /local/backgrounds/tianshu-liu-aqZ3UAjs_M4-unsplash.jpg
  background_blur: 15px
  background_opacity: 0.6
```

## Create the Helper via YAML

Add to `configuration.yaml`:

```yaml
input_text:
  current_background_image:
    name: Current Background Image
    initial: /local/backgrounds/tianshu-liu-aqZ3UAjs_M4-unsplash.jpg
    min: 0
    max: 255
    icon: mdi:image
```

Then restart Home Assistant.

## Dynamic Background Automation Example

Create an automation to change background based on time:

```yaml
automation:
  - alias: Change Dashboard Background by Time
    trigger:
      - platform: time
        at: "06:00:00"
      - platform: time
        at: "12:00:00"
      - platform: time
        at: "18:00:00"
      - platform: time
        at: "22:00:00"
    action:
      - service: input_text.set_value
        target:
          entity_id: input_text.current_background_image
        data:
          value: >-
            {% set hour = now().hour %}
            {% if 6 <= hour < 12 %}
              /local/backgrounds/morning.jpg
            {% elif 12 <= hour < 18 %}
              /local/backgrounds/afternoon.jpg
            {% elif 18 <= hour < 22 %}
              /local/backgrounds/evening.jpg
            {% else %}
              /local/backgrounds/night.jpg
            {% endif %}
```

## Expected Console Output (When Working)

After fixing, you should see:

```
Rendering template: {{ states('input_text.current_background_image') }}
Template rendered successfully: {{ states('input_text.current_background_image') }} -> /local/backgrounds/tianshu-liu-aqZ3UAjs_M4-unsplash.jpg
Background image (raw): "/local/backgrounds/tianshu-liu-aqZ3UAjs_M4-unsplash.jpg"
Background image (trimmed): "/local/backgrounds/tianshu-liu-aqZ3UAjs_M4-unsplash.jpg"
Creating background with image: /local/backgrounds/tianshu-liu-aqZ3UAjs_M4-unsplash.jpg blur: 15px opacity: 0.6
Setting background-image to: url('/local/backgrounds/tianshu-liu-aqZ3UAjs_M4-unsplash.jpg')
Element style.backgroundImage: url("/local/backgrounds/tianshu-liu-aqZ3UAjs_M4-unsplash.jpg")
Background element in DOM: url("/local/backgrounds/tianshu-liu-aqZ3UAjs_M4-unsplash.jpg")
```

## Summary

**The template is working!** It's just rendering to `null` because:
- ✅ Template system is functioning
- ✅ Background code is working
- ❌ Entity doesn't have a value

**Quick fix**: Set the value for `input_text.current_background_image` and it will work immediately!

Updated build now includes:
- ✅ Null value detection
- ✅ Clear error messages
- ✅ Instructions in console
- ✅ No `url('null')` created
