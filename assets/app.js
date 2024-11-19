(async () => {
  const app = new PIXI.Application();
  await app.init({
    width: window.innerWidth,
    height: window.innerHeight,
    resolution: window.devicePixelRatio || 1,
    antialias: true,
  });
  document.body.appendChild(app.canvas);

  await PIXI.Assets.load([
    "./assets/spritesheets/animations-0.json",
    "./assets/spritesheets/sky.png",
  ]);

  const background = PIXI.Sprite.from("./assets/spritesheets/sky.png");
  background.width = app.screen.width;
  background.height = app.screen.height;
  app.stage.addChild(background);

  const animations = PIXI.Assets.cache.get(
    "./assets/spritesheets/animations-0.json"
  ).data.animations;

  const getResponsiveValues = () => {
    const { innerWidth: width, innerHeight: height } = window;
    const aspectRatio = width / height;
    const isLandscape = width > height;

    let scale = 1;
    let verticalOffset = 0.88;
    let shouldAnimateToCenter = false;

    if (width < 768) {
      scale = 0.65;
      if (height < 668) {
        scale *= 1;
        verticalOffset = 0.48;
      } else if (height > 900) {
        shouldAnimateToCenter = true;
        scale *= 1;
        verticalOffset = 0.6;
      } else if (height > 800) {
        shouldAnimateToCenter = true;
        scale *= 1;
        verticalOffset = 0.59;
      } else {
        verticalOffset = 0.53;
      }

      if (isLandscape) {
        if (height < 668) {
          scale = 0.6;
          verticalOffset = 0.1;
        }
      }
    } else if (width < 1024) {
      scale = height < 768 ? 0.5 : 0.8;
      verticalOffset = height < 768 ? 0.52 : 0.49;
    } else if (height < 400) {
      scale = 0.5;
      verticalOffset = 0.31;
    } else {
      if (height < 768) {
        scale = 0.7;
        verticalOffset = 0.2;
      } else if (height < 400) {
        scale = 0.2;
        verticalOffset = 0.35;
      } else if (height > 1080) {
        scale = 0.6;
        verticalOffset = 0.55;
      } else {
        scale = 0.7;
        verticalOffset = 0.47;
      }
    }

    if (aspectRatio < 0.8) {
      scale *= 1;
    } else if (aspectRatio > 2) {
      scale *= 0.9;
    }

    return {
      scale,
      shouldAnimateToCenter,
      centerPoint: {
        x: width / 2,
        y: height * verticalOffset,
      },
    };
  };

  const cloudConfig = {
    mobile: {
      maxClouds: 12,
      spawnGap: 80,
      horizontalVariation: 0.15,
      speeds: {
        firstFloating: {
          min: 8,
          max: 10,
        },
        acceleration: {
          min: 14,
          max: 16,
        },
        secondFloating: {
          min: 18,
          max: 20,
        },
      },
    },
    desktop: {
      maxClouds: 90,
      spawnGap: 60,
      horizontalVariation: 1.0,
      speeds: {
        firstFloating: {
          min: 8,
          max: 10,
        },
        acceleration: {
          min: 14,
          max: 16,
        },
        secondFloating: {
          min: 18,
          max: 20,
        },
      },
    },
  };

  const cloudsContainer = new PIXI.Container();
  app.stage.addChild(cloudsContainer);

  let cloudSprites = [];
  let isCloudAnimating = false;
  let isSlowingDown = false;
  let slowdownFactor = 1;
  let lastSlowdownTime = 0;
  let isCloudsStopped = false;
  let currentCloudState = "firstFloating";
  const slowdownDuration = 3000;

  const createNewCloud = () => {
    const isMobile = window.innerWidth < 768;
    const config = isMobile ? cloudConfig.mobile : cloudConfig.desktop;

    if (cloudSprites.length >= config.maxClouds || isCloudsStopped) {
      return null;
    }

    const cloudFrames = animations["clouds/Cloud"];
    const randomFrameIndex = Math.floor(Math.random() * cloudFrames.length);
    const cloud = PIXI.Sprite.from(cloudFrames[randomFrameIndex]);
    cloud.anchor.set(0.5);
    cloud.scale.set(getResponsiveValues().scale * 1.05);

    if (isMobile) {
      const centerX = app.screen.width / 2;
      const horizontalVariation = app.screen.width * config.horizontalVariation;
      cloud.position.set(
        centerX + (Math.random() - 0.5) * horizontalVariation,
        -300
      );
    } else {
      cloud.position.set(Math.random() * app.screen.width, -300);
    }

    cloud.rotation = (Math.random() - 0.5) * 0.2;
    cloud.speed = 0;
    cloud.initialSpeed = 0;
    cloudsContainer.addChild(cloud);
    cloudSprites.push(cloud);
    return cloud;
  };

  const getCloudSpeed = (state) => {
    const isMobile = window.innerWidth < 768;
    const config = isMobile ? cloudConfig.mobile : cloudConfig.desktop;
    const speeds = config.speeds[state];
    return speeds ? speeds.min + Math.random() * (speeds.max - speeds.min) : 0;
  };

  const updateCloudsSpeeds = (newState) => {
    currentCloudState = newState;
    cloudSprites.forEach((cloud) => {
      const newSpeed = getCloudSpeed(newState);
      cloud.speed = newSpeed;
      cloud.initialSpeed = newSpeed;
    });
  };

  const startCloudDescent = (state) => {
    isCloudAnimating = true;
    isSlowingDown = false;
    currentCloudState = state;

    if (state === "firstFloating") {
      isCloudsStopped = false;
    }

    let frameCount = 0;
    let lastCloudTime = 0;
    const isMobile = window.innerWidth < 768;
    const config = isMobile ? cloudConfig.mobile : cloudConfig.desktop;

    const animate = (timestamp) => {
      if (!isCloudAnimating) return;
      frameCount++;

      if (frameCount - lastCloudTime >= config.spawnGap) {
        if (cloudSprites.length < config.maxClouds && !isCloudsStopped) {
          const newCloud = createNewCloud();
          if (newCloud) {
            const speed = getCloudSpeed(currentCloudState);
            newCloud.speed = speed;
            newCloud.initialSpeed = speed;
            lastCloudTime = frameCount;
          }
        }
      }

      cloudSprites = cloudSprites.filter((cloud) => {
        if (cloud.position.y >= app.screen.height + 300) {
          cloudsContainer.removeChild(cloud);
          return false;
        }

        if (!isCloudsStopped) {
          cloud.position.y += cloud.speed;
        }
        return true;
      });

      requestAnimationFrame(animate);
    };

    animate(performance.now());
  };

  const stopCloudsGradually = () => {
    const slowdownDuration = 1000;
    const startTime = performance.now();
    const existingClouds = [...cloudSprites];
    const cloudStates = existingClouds.map((cloud) => ({
      speed: cloud.speed,
      position: { x: cloud.position.x, y: cloud.position.y },
    }));

    let animationFrame;
    const animate = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / slowdownDuration, 1);
      const easeOutCubic = 1 - Math.pow(1 - progress, 3);

      existingClouds.forEach((cloud, index) => {
        if (cloudSprites.includes(cloud)) {
          const originalState = cloudStates[index];
          cloud.speed = originalState.speed * (1 - easeOutCubic);
          cloud.position.y += cloud.speed;
        }
      });

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      } else {
        isCloudsStopped = true;
        existingClouds.forEach((cloud) => {
          if (cloudSprites.includes(cloud)) {
            cloud.speed = 0;
            cloud.initialSpeed = 0;
          }
        });
        cancelAnimationFrame(animationFrame);
      }
    };

    animationFrame = requestAnimationFrame(animate);
  };

  const { centerPoint, scale, shouldAnimateToCenter } = getResponsiveValues();

  const config = {
    ground: {
      frames: animations["ground/final"],
      animationSpeed: 1 / 2.6,
      loops: 1,
      triggerFrame: 42,
    },
    dog: {
      frames: animations["intro/final"],
      animationSpeed: 1 / 2.4,
      loops: 1,
    },
    floating: {
      frames: [
        ...animations["floating/final"],
        ...animations["floating2/final"],
      ],
      animationSpeed: 1 / 20,
      loops: 1,
    },
    acceleration: {
      frames: animations["acceleration/final"],
      animationSpeed: 1 / 3,
      loops: 1,
    },
    eyes: {
      frames: animations["eyes/final"],
      animationSpeed: 1 / 3,
      loops: 1,
    },
    falling: {
      frames: animations["falling/final"],
      animationSpeed: 1 / 2,
      loops: 1,
    },
  };

  const sprites = {};

  const createSprite = (key) => {
    const sprite = PIXI.AnimatedSprite.fromFrames(config[key].frames);
    sprite.animationSpeed = config[key].animationSpeed;
    sprite.anchor.set(0.5);
    sprite.scale.set(scale);
    sprite.position.set(centerPoint.x, centerPoint.y);
    sprite.loop = false;
    sprites[key] = sprite;
    return sprite;
  };

  Object.keys(config).forEach(createSprite);

  const sequenceState = {
    currentAnimation: null,
    currentLoopCount: 0,
    sequence: [
      "ground",
      "dog",
      "floating",
      "acceleration",
      "floating",
      "eyes",
      "falling",
    ],
    currentIndex: 0,
    dogStarted: false,
    hasReachedCenter: false,
  };

  let targetCenterY = null;

  const animateToCenter = (sprite) => {
    if (!shouldAnimateToCenter) return;

    targetCenterY = window.innerHeight * 0.5;
    const duration = 2500;
    const startY = sprite.position.y;
    const startTime = performance.now();

    const animate = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easing = 1 - Math.pow(1 - progress, 4);

      sprite.position.y = startY + (targetCenterY - startY) * easing;

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  };

  const startDogAnimation = () => {
    if (!sequenceState.dogStarted) {
      sequenceState.dogStarted = true;
      const dogSprite = sprites["dog"];
      app.stage.addChild(dogSprite);
      dogSprite.gotoAndPlay(0);

      dogSprite.onComplete = () => {
        app.stage.removeChild(dogSprite);
        sequenceState.currentIndex = 2;
        startNextAnimation();
      };
    }
  };

  const startNextAnimation = () => {
    if (sequenceState.currentIndex === 0) {
      targetCenterY = null;
      sequenceState.dogStarted = false;
      sequenceState.hasReachedCenter = false;
      cloudSprites = [];
      cloudsContainer.removeChildren();
      isCloudAnimating = false;
      isSlowingDown = false;
      slowdownFactor = 1;
    }

    const currentAnim = sequenceState.sequence[sequenceState.currentIndex];
    sequenceState.currentAnimation = currentAnim;
    const sprite = sprites[currentAnim];

    const { scale: currentScale, centerPoint: currentCenterPoint } =
      getResponsiveValues();
    sprite.scale.set(currentScale);

    if (
      currentAnim === "floating" &&
      !sequenceState.hasReachedCenter &&
      shouldAnimateToCenter
    ) {
      sprite.position.set(currentCenterPoint.x, currentCenterPoint.y);
      animateToCenter(sprite);
    } else {
      sprite.position.set(
        currentCenterPoint.x,
        sequenceState.hasReachedCenter && shouldAnimateToCenter
          ? window.innerHeight * 0.5
          : currentCenterPoint.y
      );
    }

    // Update cloud animation states based on current animation
    if (["floating", "acceleration", "eyes", "falling"].includes(currentAnim)) {
      let cloudState;
      if (currentAnim === "floating") {
        cloudState = sequenceState.hasReachedCenter
          ? "secondFloating"
          : "firstFloating";
      } else if (currentAnim === "acceleration") {
        cloudState = "acceleration";
      } else if (currentAnim === "eyes") {
        isCloudAnimating = false;
        stopCloudsGradually();
      } else {
        cloudState = "secondFloating";
      }

      if (!isCloudAnimating && currentAnim !== "eyes") {
        startCloudDescent(cloudState);
      } else if (
        isCloudAnimating &&
        cloudState &&
        cloudState !== currentCloudState
      ) {
        updateCloudsSpeeds(cloudState);
      }
    }

    if (!app.stage.children.includes(sprite)) {
      app.stage.addChild(sprite);
    }
    sprite.gotoAndPlay(0);

    if (currentAnim === "ground") {
      sprite.onFrameChange = (frame) => {
        if (frame === config.ground.triggerFrame) startDogAnimation();
      };
    }

    sprite.onComplete = () => {
      sequenceState.currentLoopCount++;
      if (sequenceState.currentLoopCount < config[currentAnim].loops) {
        sprite.gotoAndPlay(0);
      } else {
        sequenceState.currentLoopCount = 0;
        app.stage.removeChild(sprite);

        if (currentAnim === "floating" && !sequenceState.hasReachedCenter) {
          sequenceState.hasReachedCenter = true;
        }

        sequenceState.currentIndex =
          sequenceState.currentIndex === sequenceState.sequence.length - 1
            ? 0
            : sequenceState.currentIndex + 1;

        if (currentAnim !== "ground") {
          startNextAnimation();
        }
      }
    };
  };

  startNextAnimation();

  window.addEventListener("resize", () => {
    const newWidth = window.innerWidth;
    const newHeight = window.innerHeight;

    app.renderer.resize(newWidth, newHeight);
    background.width = newWidth;
    background.height = newHeight;

    const {
      centerPoint: newCenterPoint,
      scale: newScale,
      shouldAnimateToCenter: newShouldAnimateToCenter,
    } = getResponsiveValues();
    centerPoint.x = newCenterPoint.x;
    centerPoint.y =
      targetCenterY && shouldAnimateToCenter ? targetCenterY : newCenterPoint.y;

    Object.values(sprites).forEach((sprite) => {
      sprite.position.set(centerPoint.x, centerPoint.y);
      sprite.scale.set(newScale);
    });

    cloudSprites.forEach((cloud) => {
      cloud.scale.set(newScale * 0.8);
    });
  });
})();
