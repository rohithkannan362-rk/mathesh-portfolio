# mathesh-portfolio

Personal portfolio of **Matheshwaran A S** — Full Stack Developer & AI Product Engineer.

A single-page site with a cinematic video welcome, a full-screen hero video, a WebGL particle
sculpture with gold & silver dust, and scroll-driven animations.

## Run locally

```bash
npx -y http-server@14.1.1 . -p 5173 -c-1 -o
```

Then open http://localhost:5173.

## Stack

- Plain HTML, CSS and JavaScript (no build step)
- [Three.js](https://threejs.org/) for the WebGL background
- [GSAP](https://gsap.com/) + ScrollTrigger for animation
- [Lenis](https://lenis.darkroom.engineering/) for smooth scrolling

## Structure

```
index.html          page markup
css/style.css       styles
js/main.js          animation, WebGL, video and sound logic
assets/             images, résumé PDF and encoded videos
```

The hero video is served in 1080p, 1440p or 4K depending on the visitor's screen.
