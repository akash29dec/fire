const canvasEl = document.querySelector("#fire-overlay");
const scrollMsgEl = document.querySelector(".scroll-msg");

// Use lower pixel ratio for mobile to improve performance
const devicePixelRatio = window.innerWidth < 768 ? 0.75 : Math.min(window.devicePixelRatio, 2);

const params = {
    fireTime: .35,
    fireTimeAddition: 0
};

let st, uniforms;
const gl = initShader();

st = gsap.timeline({
    scrollTrigger: {
        trigger: ".page",
        start: "0% 0%",
        end: "100% 100%",
        scrub: true,
        onLeaveBack: () => {
            // Tweak to avoid too many updates during scroll back
            params.fireTimeAddition = 0;
        },
        // Avoid triggering animations too frequently by throttling the refresh rate
        refreshPriority: 1,
        fastScrollEnd: true,
        anticipatePin: 1,
        invalidateOnRefresh: true,
    },
})
    .to(scrollMsgEl, {
        duration: .1,
        opacity: 0
    }, 0)
    .to(params, {
        fireTime: .63
    }, 0);

window.addEventListener("resize", resizeCanvas);
resizeCanvas();

// Set initial opacity for page
gsap.set(".page", {
    opacity: 1
});

function initShader() {
    const vsSource = document.getElementById("vertShader").innerHTML;
    const fsSource = document.getElementById("fragShader").innerHTML;

    const gl = canvasEl.getContext("webgl") || canvasEl.getContext("experimental-webgl");

    if (!gl) {
        alert("WebGL is not supported by your browser.");
        return null;
    }

    function createShader(gl, sourceCode, type) {
        const shader = gl.createShader(type);
        gl.shaderSource(shader, sourceCode);
        gl.compileShader(shader);

        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            console.error("An error occurred compiling the shaders: " + gl.getShaderInfoLog(shader));
            gl.deleteShader(shader);
            return null;
        }

        return shader;
    }

    const vertexShader = createShader(gl, vsSource, gl.VERTEX_SHADER);
    const fragmentShader = createShader(gl, fsSource, gl.FRAGMENT_SHADER);

    function createShaderProgram(gl, vertexShader, fragmentShader) {
        const program = gl.createProgram();
        gl.attachShader(program, vertexShader);
        gl.attachShader(program, fragmentShader);
        gl.linkProgram(program);

        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            console.error("Unable to initialize the shader program: " + gl.getProgramInfoLog(program));
            return null;
        }

        return program;
    }

    const shaderProgram = createShaderProgram(gl, vertexShader, fragmentShader);
    uniforms = getUniforms(shaderProgram);

    function getUniforms(program) {
        let uniforms = [];
        let uniformCount = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
        for (let i = 0; i < uniformCount; i++) {
            let uniformName = gl.getActiveUniform(program, i).name;
            uniforms[uniformName] = gl.getUniformLocation(program, uniformName);
        }
        return uniforms;
    }

    const vertices = new Float32Array([-1., -1., 1., -1., -1., 1., 1., 1.]);

    const vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    gl.useProgram(shaderProgram);

    const positionLocation = gl.getAttribLocation(shaderProgram, "a_position");
    gl.enableVertexAttribArray(positionLocation);

    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    return gl;
}

function render() {
    const currentTime = performance.now();
    
    // Only update WebGL uniform if gl and uniforms are properly initialized
    if (gl && uniforms) {
        gl.uniform1f(uniforms.u_time, currentTime);
        gl.uniform1f(uniforms.u_progress, params.fireTime + params.fireTimeAddition);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }
    
    // Use requestAnimationFrame to throttle the rendering and avoid overloading CPU
    requestAnimationFrame(render);
}

function resizeCanvas() {
    const width = window.innerWidth;
    const height = window.innerHeight;

    // Adjust canvas size for mobile performance and ensure proper resizing
    canvasEl.width = width * devicePixelRatio;
    canvasEl.height = height * devicePixelRatio;

    if (gl) {
        gl.viewport(0, 0, canvasEl.width, canvasEl.height);
        gl.uniform2f(uniforms.u_resolution, canvasEl.width, canvasEl.height);
    }
    render();
}
