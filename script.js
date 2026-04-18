
function calculate() {
try {

let l = parseFloat(document.getElementById("length").value);
let V = parseFloat(document.getElementById("voltage").value) * 1000;
let P = parseFloat(document.getElementById("power").value) * 1000000;
let pf = parseFloat(document.getElementById("pf").value);
let f = parseFloat(document.getElementById("freq").value);

let systemType = document.getElementById("systemType").value;

// Validation
if (isNaN(l) || isNaN(V) || isNaN(P) || isNaN(pf) || isNaN(f)) {
    alert("Enter valid main inputs");
    return;
}


let Deq;

// SYSTEM TYPE
if (systemType === "sym") {
    let d_sym = parseFloat(document.getElementById("d").value);
    if (isNaN(d_sym)) {
        alert("Enter symmetrical spacing");
        return;
    }
    Deq = d_sym;

} else if (systemType === "unsym") {

    let Dab = parseFloat(document.getElementById("d1").value);
    let Dbc = parseFloat(document.getElementById("d2").value);
    let Dca = parseFloat(document.getElementById("d3").value);

    if (isNaN(Dab) || isNaN(Dbc) || isNaN(Dca)) {
        alert("Enter all unsymmetrical distances");
        return;
    }

    Deq = Math.cbrt(Dab * Dbc * Dca);

} else {
    alert("Invalid system type");
    return;
}

// BUNDLE PARAMETERS
let Dst = parseFloat(document.getElementById("strandDia").value);
let N = parseFloat(document.getElementById("Nstrand").value);
let d_sub = parseFloat(document.getElementById("Dsub").value);
let n = parseFloat(document.getElementById("nSub").value);
let R = parseFloat(document.getElementById("Res").value);


if (isNaN(Dst) || isNaN(N) || isNaN(d_sub) || isNaN(n) || isNaN(R)) {
    alert("Enter bundle parameters correctly");
    return;
}

function complex(r, i) {
    return { real: r, imag: i };
}

function add(a, b) {
    return complex(a.real + b.real, a.imag + b.imag);
}

function multiply(a, b) {
    return complex(
        a.real*b.real - a.imag*b.imag,
        a.real*b.imag + a.imag*b.real
    );
}

function divide(a, b) {
    let denom = b.real*b.real + b.imag*b.imag;
    return complex(
        (a.real*b.real + a.imag*b.imag)/denom,
        (a.imag*b.real - a.real*b.imag)/denom
    );
}

function scale(a, k) {
    return complex(a.real * k, a.imag * k);
}
function sqrtComplex(z) {
    let r = Math.sqrt(Math.sqrt(z.real*z.real + z.imag*z.imag));
    let theta = (Math.atan2(z.imag, z.real) / 2);
    return complex(r*Math.cos(theta), r*Math.sin(theta));
}

function polar(z) {
    let mag = Math.sqrt(z.real*z.real + z.imag*z.imag);
    let angle = Math.atan2(z.imag, z.real) * (180/Math.PI);
    return mag.toFixed(8) + " ∠ " + angle.toFixed(2) + "°";
}
function conj(z) {
    return complex(z.real, -z.imag);
}
function cosh(z) {
    let expZ = complex(Math.exp(z.real) * Math.cos(z.imag), Math.exp(z.real) * Math.sin(z.imag));
    let expNegZ = complex(Math.exp(-z.real) * Math.cos(-z.imag), Math.exp(-z.real) * Math.sin(-z.imag));
    return scale(add(expZ, expNegZ), 0.5);
}
function sinh(z) {
    let expZ = complex(Math.exp(z.real) * Math.cos(z.imag), Math.exp(z.real) * Math.sin(z.imag));
    let expNegZ = complex(Math.exp(-z.real) * Math.cos(-z.imag), Math.exp(-z.real) * Math.sin(-z.imag));
    return scale(add(expZ, scale(expNegZ, -1)), 0.5);
}

// Step 1
let x = 0.5 + Math.sqrt((N / 3)-(1/12));   // Solving quadratic equation to find x from N
let r = (Dst/2) * (2 * x - 1) * 0.001;   // Radius of sub-conductor in meters
let r_dash = 0.7788 * r;   // GMD of strands in sub-conductor

let Req, req; 
if (n===2 || n===3) {
    Req = Math.pow(r_dash * Math.pow(d_sub, (n - 1)), 1 / n);
    req = Math.pow(r * Math.pow(d_sub, (n - 1)), 1 / n);
} else if (n === 4) {
    Req = Math.pow(r_dash *Math.sqrt(2) * Math.pow(d_sub, (n - 1)), 1 / n);
    req = Math.pow(r *Math.sqrt(2) * Math.pow(d_sub, (n - 1)), 1 / n);
}else {
    alert("Invalid number of sub-conductors");
    return;
}
// Line parameters
let L = (2e-4) * Math.log( Deq / Req );
let Cp = (2 * Math.PI * 8.854e-9) / Math.log( Deq / req);

let XL = 2 * Math.PI * f * L;
let XC = 1 / (2 * Math.PI * f * Cp);

let Z = complex(R , XL );   // Z = R + jXL
let Y = complex(0, 1 / XC);   // Y = j1/XC

let ModIr = P / (Math.sqrt(3) * V * pf);
let sinphi = Math.sqrt(1 - pf * pf);
let ModZ = Math.sqrt(R ** 2 + XL ** 2);
let ModY = 1 / XC;
let Zc = sqrtComplex(divide(Z, Y));
let ModZc = Math.sqrt(ModZ / ModY);
let phi = Math.acos(pf);
let Ir=complex(ModIr * Math.cos(phi), -ModIr * Math.sin(phi));
let Vr = complex(V, 0);
let ModVrp = V/Math.sqrt(3);
let Vrp = complex(ModVrp, 0); 

// LINE MODEL

let model = document.getElementById("LineModel").value;

let A = 0, B = 0, C = 0, D = 0;

if (model === "short") {
    A = complex(1, 0);
    B = complex(R * l, XL * l);
    C = complex(0, 0);
    D = A;

} else if (model === "medium") {

// A = 1 + YZ/2
let YZ = (multiply(Y , Z));
let SYZ = scale(YZ, l*l * 0.5);
A = add(complex(1, 0), SYZ);

B = scale(Z, l);

// C = Y(1 + YZ/4)
let temp = add(complex(1, 0), scale(YZ, l * l * 0.25));
C_s = multiply(Y, temp);
C = scale(C_s, l);

D = A;

} else if (model === "long") {

let gamma = sqrtComplex(multiply(Y, Z));

// gamma * l
let gl = scale(gamma, l);

A = cosh(gl);
B = multiply(Zc, sinh(gl));
C = multiply(divide(complex(1,0), Zc), sinh(gl));
D = A;
   
} else {
    alert("Invalid line model selected");
    return;
}


// Vs = A*Vr + B*Ir
let AVr = multiply(A, Vrp);
let BIr = multiply(B, Ir);
let Vs = add(AVr, BIr);

// Is = C*Vr + D*Ir
let CVr = multiply(C, Vrp);
let DIr = multiply(D, Ir);
let Is = add(CVr, DIr);

let Ic, Y_half, Ic1, Ic2, Vsl;
if (model === "medium") {
    Yt = scale(Y, l);
 Y_half =(divide(Yt, complex(2, 0)));
 Ic = multiply(Y_half, Vs);

} else if (model === "long") {
    Vsl = scale(Vs, Math.sqrt(3));
    Ic = multiply(Y,Vsl);
}else {
    Ic = complex(0, 0);
}
let ModA = Math.sqrt(A.real * A.real + A.imag * A.imag);


let ModVs = Math.sqrt(Vs.real*Vs.real + Vs.imag*Vs.imag);
let VR = (((ModVs/ModA) - ModVrp) / (ModVrp)) * 100;
let Vsll = (scale(Vs,Math.sqrt(3))); // Sending end line-to-line voltage
let VslkV = scale(Vsll, 0.001); // in kV
let Sr = multiply(Vrp, conj(Ir));
let Ss = multiply(Vs, conj(Is));
let Pr = Sr.real;
let Ps = Ss.real;
let Ploss = 3 * (Ps - Pr); 

// CLEAR RESULT BEFORE PRINTING
document.getElementById("result").innerHTML = 
"Inductance = " + L.toFixed(6) + " H/km<br>" +
"Capacitance = " + Cp.toFixed(9) + " F/km<br>" +
"XL = " + (XL * l).toFixed(3) + " Ω<br>" +
"XC = " + (XC/l).toFixed(3) + " Ω<br>" +
"A = " + polar(A) + 
", B = " + polar(B) + 
", C = " + polar(C) + 
", D = " + polar(D) + "<br>" +
"Sending end Voltage = " + polar(VslkV) + " kV<br>" +
"Sending end Current = " + polar(Is) + " A<br>" +
"Charging Current drawn from sending end = " + polar(Ic) + " A<br>" +
"% Voltage Regulation = " + VR.toFixed(2) + "%<br>" +
"Power Loss of Line = " + (Ploss/1000000).toFixed(2) + " MW<br>" +
"Transmission Efficiency = " + ((Pr / Ps) * 100).toFixed(2) + "%<br>"+
"Surge Impedance = " + ModZc.toFixed(2) + " Ω<br>" +
"Surge Impedance Loading = " + (V * V  / ModZc / 1000000 ).toFixed(2) + " MW";
}

catch (error) {
console.log(error);
alert("Error: " + error.message);
}
}