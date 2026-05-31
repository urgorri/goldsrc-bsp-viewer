export const bspShader = {
    vertexShader: `
        attribute vec2 lightUv;
        varying vec2 vUv;
        varying vec2 vLightUv;
        varying vec3 vNormal;
        varying vec3 vViewPosition;

        void main() {
            vUv = uv;
            vLightUv = lightUv;
            vNormal = normalize(normalMatrix * normal);
            vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
            vViewPosition = -mvPosition.xyz;
            gl_Position = projectionMatrix * mvPosition;
        }
    `,
    fragmentShader: `
        uniform sampler2D diffuseMap;
        uniform sampler2D lightmapAtlas;
        uniform bool hasLightmap;
        uniform float opacity;
        varying vec2 vUv;
        varying vec2 vLightUv;
        varying vec3 vNormal;
        varying vec3 vViewPosition;

        void main() {
            // Sample diffuse
            vec4 diffuseColor = texture2D(diffuseMap, vUv);

            // Handle transparency from texture ({ textures)
            if (diffuseColor.a < 0.1) discard;

            vec3 finalColor;
            if (hasLightmap) {
                vec3 lightColor = texture2D(lightmapAtlas, vLightUv).rgb;
                finalColor = diffuseColor.rgb * lightColor;
                float gamma = 1.6;
                finalColor = pow(finalColor, vec3(1.0/gamma));
            } else {
                // Better fallback lighting
                vec3 normal = normalize(vNormal);
                vec3 lightDir = normalize(vec3(0.5, 1.0, 0.5));
                float dotNL = max(dot(normal, lightDir), 0.3);
                finalColor = diffuseColor.rgb * dotNL;
            }

            gl_FragColor = vec4(finalColor, opacity);
        }
    `
};
