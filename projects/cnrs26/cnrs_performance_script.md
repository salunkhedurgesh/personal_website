# CNRS Audition Performance Script (15 min)

**Legend**
- **[pause]**: brief pause
- **[long pause]**: stronger pause for impact
- **[emphasize: ...]**: stress these words
- **[slow down]**: slightly slower, clearer delivery

~~~~~~~~~~~~~~~~
1.5 min
~~~~~~~~~~~~~~~~

France has repeatedly reported staffing shortages in operating rooms, [pause] which makes the need for robotic assistance both immediate and concrete. [long pause]

My research goal is therefore to develop **[emphasize: safe, reliable, and human-centered]** robotic systems that can meaningfully support clinicians in demanding care environments. [long pause]

To make this vision more concrete, [pause] imagine a surgeon asking a robot for a scalpel during a procedure. [long pause]

Today, [pause] we are still far from that stage. [pause] I see **[emphasize: three main barriers]** that must be overcome to get there. [pause]

First, [pause] robots must execute learned skills reliably. [pause]
Second, [pause] a skill taught to one robot should be transferable to newer robots with different properties. [pause]
And third, [pause] this interaction must remain embodied and transparent, meaning that the robot’s behaviour should be understandable, predictable, and aligned with human intent. [long pause]

To address these barriers, [pause] I propose a **[emphasize: co-design approach]**: to develop robot designs and learning paradigms together, from the ground up, for human-robot interaction. [long pause]

~~~~~~~~~~~~~~~~
1.5 min
~~~~~~~~~~~~~~~~

I would now like to present the academic preparation that supports this vision, [pause] and the two research themes that naturally emerge from my past work. [long pause]

I hold a double Master’s degree in Advanced Robotics from the University of Genova and École Centrale de Nantes. [pause]
I completed my Master’s thesis on the optimization of robot design for endoscopic otological surgery. [pause]
This work was supervised by Damien Chablat and carried out in collaboration with CHU Nantes and DFKI Germany. [long pause]

I then started my PhD in theoretical kinematics at LS2N as a CNRS doctoral researcher within an ANR project, under the supervision of Philippe Wenger and Damien Chablat. [pause]
During this period, I made contributions in robot design synthesis and developed a practical framework for safe and reliable path planning in commercial robots. [pause]
I also had the opportunity to collaborate with researchers from Sorbonne University, JKU Linz, and the University of Innsbruck. [long pause]

To broaden my perspective toward learning and modern robotics, [pause] I joined EPFL as a postdoctoral researcher in the LASA laboratory, one of the leading groups in learning from demonstration. [pause]
There, I work with Prof. Aude Billard on safe and explainable cross-robot skill transfer. [pause]
Alongside my research at EPFL, I also collaborate with researchers from IRI Spain and IIT India on advanced kinematic analysis and novel robot designs. [long pause]

~~~~~~~~~~~~~~~~
4 min
~~~~~~~~~~~~~~~~

Let me now explain how my past work naturally leads to this proposal. [long pause]

During my PhD, I worked on the kinematic analysis of serial robots, especially 3R and 6R robots. [pause]
Here, an nR robot simply means a robot with n revolute joints. [pause]
A key concept is inverse kinematics, which means computing the different joint configurations that allow the robot to reach the same target. [long pause]

In robot path planning, we usually distinguish two spaces. [pause]
The first is the workspace, which describes the motion of the robot end-effector in the task environment. [pause]
The second is the joint space, which describes the motion of the robot through its joint coordinates. [pause]
These two are linked by the Jacobian matrix, which maps joint velocities to end-effector velocities. [pause]
Another important concept for robot control is a singularity. [pause]
At a singularity, the robot loses motion capability, and therefore control becomes difficult. [long pause]

My PhD focused on **[emphasize: cuspidal robots]**, that is, robots that can change inverse-kinematic solution without crossing a singularity. [pause] This makes path planning much more complex. [long pause]

Before my work, only 3R cuspidal robots had been studied for path planning, and for 6R robots only isolated results were available. [pause]
This led to two questions: [pause] how can we decide whether a given 6R robot is cuspidal, [pause] and what does cuspidality imply for path planning of commercial robots? [long pause]

To address this, I combined geometric, algebraic, and numerical tools to develop a practical framework for cuspidality analysis and classification. [pause]
I showed that even small deviations from conventional industrial designs often lead to cuspidal behaviour, [pause] and that cuspidal robots admit specific path types that make motion planning fundamentally more complex. [pause]
I also developed a framework for safe and reliable path planning of commercial 6R robots. [long pause]

This work then led me to a second question. [pause]
If future collaborative robots must learn skills from humans and execute them online, [pause] how can we make this learning reliable, safe, and transferable? [long pause]

This is what I pursued at EPFL in the LASA lab with Prof. Aude Billard, where I work on learning from demonstration and explainable cross-robot skill transfer. [pause]
The scientific lock here is the following: [pause] how can we learn a control policy from a demonstration once, and transfer it across robots in a safe and deterministic way? [pause]
Here, by control policy, I mean a map between the robot's current state and the next actions. [pause]
A control policy can be visualized as a vector field in the space. [long pause]

In the existing state of the art, transfer is often addressed through data-driven adaptation or repeated model tuning to account for the morphology of each robot. [pause]
My approach departs from this logic. [pause]
First, I used stable dynamical systems to encode the demonstrated behaviour as robust control policies. [pause]
Second, I injected analytical kinematic properties directly into the learning model, so that the execution remains faithful to each robot’s morphology. [pause]
The key idea is simple: [pause] a **[emphasize: robot-agnostic policy]** must be combined with **[emphasize: robot-specific execution]**. [pause]
This work has now culminated in our recent Science Robotics result on kinematic intelligence for cross-robot skill transfer. [long pause]

Taken together, [pause] my PhD and postdoctoral work form the two foundations of my CNRS project: [pause] understanding robot kinematics globally, [pause] and embedding this understanding into learning and control. [long pause]

~~~~~~~~~~~~~~~~
3 min
~~~~~~~~~~~~~~~~

Let me now turn to the first phase of my proposal, which addresses the first barrier: **[emphasize: reliable execution in robots]**. [long pause]

The motivation is the following. [pause]
From my previous work, we now know that even small deviations from conventional robot design often lead to cuspidal robots. [pause]
At the same time, collaborative robotics is producing new robot morphologies at a fast pace. [pause]
This makes the study of cuspidal robots both urgent and necessary for future human-robot interaction. [long pause]

On the design side, the first scientific lock is that the kinematic analysis of cuspidal robots becomes much harder as dimension increases. [pause]
In other words, [pause] the problem suffers from a **[emphasize: curse of dimensionality]**. [long pause]

My approach is to study the singularities and workspace structure of these robots in a systematic way. [pause]
I want to classify robots through the topology of their singularities, and combine analytical and semi-analytical tools to obtain fast and practical workspace analysis. [pause]
In particular, I will investigate robust inverse-kinematic models together with dimension reduction and efficient decomposition methods. [pause]
Here is a simple example of dimension reduction: [pause] instead of analyzing the full 7R robot at once, we decompose it into two substructures and study the singularities of each one separately. [pause]
This part provides the kinematic foundation. [long pause]

On the control side, the lock is different. [pause]
Existing policy-learning approaches work well when inverse-kinematic solutions are clearly separated by singularities, because each solution can be associated with its own isolated policy. [pause]
But in cuspidal robots, several solutions may coexist without such separation, which creates ambiguity in execution. [long pause]

My answer is to extend the concept of kinematic intelligence. [pause]
The idea is to inject kinematic properties into the control policy from the earliest stage, rather than correcting the motion afterward. [pause]
Concretely, when multiple solutions are possible, the controller should rapidly identify the relevant feasible ones and choose the one that remains closest to the demonstrated intent. [pause]
The challenge is to do this in real time while avoiding unstable behaviours such as false attractors or dead zones. [long pause]

So the objective of this first phase is clear: [pause] on one side, understand cuspidal robots globally; [pause] on the other, use this understanding to build deterministic and explainable control policies. [pause]
This is the first concrete expression of my co-design philosophy. [long pause]

~~~~~~~~~~~~~~~~
3 min
~~~~~~~~~~~~~~~~

Once reliable execution on robots is addressed, [pause] my mid-term scientific focus will be to develop both robot mechanisms and learning algorithms from the ground up for human-robot interaction. [long pause]

The motivation is the following. [pause]
Conventional robots are precise, but they are rigid. [pause]
Soft robots are compliant, but they often lack precision and payload. [pause]
For human-robot interaction, we need a middle ground: [pause] robots that are lightweight, mechanically compliant, and capable of variable stiffness. [pause]
In this context, novel joints and hybrid mechanisms become especially important. [pause]
For example, anti-parallelogram or X-joints are attractive because they mimic more natural joint motion and exhibit positive co-activation, meaning that stiffness can increase as the cables are tightened. [long pause]

On the design side, the scientific lock is that the kinematic analysis of these novel joints and hybrid robots is still largely missing. [pause]
My approach will be to study their singularities, cuspidal properties, and the effect of joint limits, and then identify which of these properties can also be exploited for reliable control. [pause]
I also want to investigate hybrid serial-parallel mechanisms that combine natural rolling motion, low inertia, and better suitability for physical interaction. [pause]
Since these models often involve complex nonlinear terms, I will rely on efficient numerical and semi-analytical tools in addition to classical analytical methods. [long pause]

On the control side, the lock is that a skill learned on one robot should not have to be relearned from scratch every time a new morphology appears. [pause]
However, this becomes difficult when the new robot has fundamentally different kinematic properties. [pause]
My answer is to extend the concept of kinematic intelligence into a skill-transfer framework. [pause]
The idea is that singularities and inverse-kinematic solutions form a kind of language that describes the robot’s structure. [pause]
By leveraging this language, I want to determine what must remain invariant during transfer, and how to adapt execution in a way that remains safe, deterministic, and explainable across different generations of robots. [long pause]

This phase is where co-design becomes fully operational: [pause]
I do not only want robots that can learn safely, [pause] but robots whose very mechanics are designed to make safe and explainable learning possible. [long pause]

~~~~~~~~~~~~~~~~
1.5 min
~~~~~~~~~~~~~~~~

I have requested Team RDH at ICube in Strasbourg as my primary host. [long pause]

Strasbourg is my preferred integration site because it offers the strongest environment to develop and validate a human-centered co-design project in a healthcare setting. [pause]
Team RDH works at the interface of robotics, medical technology, and surgical applications, which matches my proposal very well. [long pause]

Scientifically, I see a strong complementarity with Pierre Renaud on mechanism design, [pause] with Florent Nageotte and Benoit Rosa on continuum robotics and minimally invasive surgery, [pause] and with Olivier Piccin on kinematic analysis. [pause]
Nicolas Padoy also brings an important bridge toward surgical data science, transfer-oriented learning, and vision-language models, which connects naturally with the transfer-learning and language-action dimensions of my project. [long pause]

Strasbourg further offers a concrete translational ecosystem through IHU Strasbourg, the University Hospital, and the IRIS platform, with robotic systems such as KUKA iiwa, UR3, UR5, and the Dobot X-trainer acquired in the context of the IMARA project. [pause]
IMARA is particularly meaningful to me because it aims at lightweight robotic assistance in the operating room. [pause]
For me, this makes Strasbourg not only an excellent host lab, but the right ecosystem to take this project from theory to real medical impact. [long pause]

~~~~~~~~~~~~~~~~
0.5 min
~~~~~~~~~~~~~~~~

I have also requested Team Gepetto at LAAS in Toulouse as my secondary host. [pause]

Toulouse provides a strong methodological complement in motion planning, whole-body control, and optimization. [pause]
I see a clear fit with Florent Lamiraux on path planning, Nicolas Mansard on optimization and co-design, and Olivier Stasse on humanoid control, with a natural software bridge through Pinocchio. [pause]
In that sense, Strasbourg is the ideal environment for the healthcare and translational dimension of my project, while Toulouse is the ideal complement for scaling its planning and control side.
