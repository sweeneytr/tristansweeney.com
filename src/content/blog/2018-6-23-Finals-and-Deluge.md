---
title: "Finals, Deluge, and mutable constness"
pubDate: "2018-6-23"
author: "Tristan Sweeney"
tags:
  - Network
imgUrl: "../../assets/bg-2.jpg"
description: |
  Can't believe it's been over a week since I last wrote a post. I'm mid finals,
  so it's a quick touch-back. I paid for Plex on Google Play, bought a new hard
  drive, and loaded up a ton of songs so I can have my own mini Spotify on the fly.
layout: "../../layouts/BlogPost.astro"
---

Can't believe it's been over a week since I last wrote a post. I'm mid finals, so it's a quick touch-back. I paid for Plex on Google Play, bought a new hard drive, and loaded up a ton of songs so I can have my own mini Spotify on the fly. I also configured Deluge-Web to auto-connect to the local daemon, without doing so it won't work on my mobile app until I use the web ui to connect it for the first time. I also learned about the `mutable` keyword in C++, which tags object fields,denoting that a const can modify it freely. This was useful for a Getter in a project I was using that had O(n) runtime to generate a single int. (I suppose I could generate it at compile time but where's the fun in that). A single `mutable std::option<int> val;` stored the result, and the getter would conditionally run the calculation if `val.has_value()` was false. Pretty nifty.
