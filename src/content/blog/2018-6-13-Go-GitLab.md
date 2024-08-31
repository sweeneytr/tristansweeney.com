---
title: "GitLab Pages > GitHub Pages?"
pubDate: "2018-6-13"
author: "Tristan Sweeney"
tags:
  - Network
imgUrl: "../../assets/bg-2.jpg"
description: |
  I just finished migrating from GitHub to GitLab.
layout: "../../layouts/BlogPost.astro"
---

I just finished migrating from GitHub to GitLab. It's not that I hate Microsoft, I'm starting to believe that their people believe the 'We <3 Linux / Open Source'PR push lately, but they're not without their adgenda. My personal belief/concern is that the stratagy is to convince people that linux desktop isn't worth it, and to work within Windows Subsystem for Linux to do their work. I figure that after aquiring GitHub, moves will eventually be made to make GH incrementally more useful to Windows users bit by bit.

But, even if Microsoft is truely helping out GH and just funding what they see as a noble venture (And if they were, why a buyout rather than just funding them?), GitLab has proven to be pretty amazing. The best feature I've found is that unlike GitHub Pages, which runs a modified Jekyll, GitLab Pages will run a CI/CD pipeline with any specified SSG (static site generator) you can dream up.

Switcing from GH to GL, the few changes were adding `layout: default` to all the templated files (GH does this as a preprocessing step if it's omitted), adding frontmatter to my index.md (it won't be processed without frontmatter, GH just forces it for ease of use) and finally I had to migrate the SASS themeing from my only GH pages to the new repo.

Doing some small CNAME record modification and sharing my HTTPS cert with GitLab, and we're good to go! (as soon as DNS records propegate). Happy Trails.
