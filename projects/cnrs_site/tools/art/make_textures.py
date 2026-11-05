from PIL import Image
import cv2,numpy as np,scipy.ndimage as nd,math,pathlib
out=(pathlib.Path(__file__).resolve().parents[2]/'images'/'atelier');r=np.random.default_rng(39)
def noise(h,w,n):return cv2.resize(r.normal(0,1,(n,n)).astype('float32'),(w,h),interpolation=cv2.INTER_CUBIC)
def fb(h,w):return sum(k*noise(h,w,n) for n,k in [(3,1),(7,.65),(15,.47),(31,.29),(72,.14),(171,.07)])
def save(n,a,q=88):Image.fromarray(np.uint8(np.clip(a,0,255))).save(out/(n+'.webp'),quality=q,method=4)
n=640;h=fb(n,n)*.2+noise(n,n,96)*.13+r.normal(0,.12,(n,n));p=np.zeros((n,n),np.float32)
for i in range(7200):
 x,y=r.integers(0,n,2);s=r.choice([1,1,1,2,2,3,4,5]);cv2.ellipse(p,(x,y),(s,max(1,int(s*r.uniform(.35,1)))),float(r.uniform(0,180)),0,360,float(r.uniform(.2,1)),-1)
h-=nd.gaussian_filter(p,.7)*1.4;dy,dx=np.gradient(h);nm=np.dstack((-dx*1.65,-dy*1.65,np.ones_like(h)));nm/=np.linalg.norm(nm,axis=2)[...,None];save('ceramic-normal',127.5*(1+nm),93);save('ceramic-grit',202+33*h-23*p,92)
for name,tint in [('holi',(34,19,33)),('india',(46,46,22)),('france',(28,36,53)),('halloween',(33,25,42)),('puppets',(52,26,19)),('studio',(40,38,35))]:
 w,h=960,330;y,x=np.mgrid[0:h,0:w];lum=.57+.46*np.sin(x/w*np.pi)+.25*(1-y/h)+.09*fb(h,w);im=np.array(tint)*lum[:,:,None];
 for k in range(95):
  cx,cy=r.uniform(0,w),r.uniform(-90,h+20);rr=r.uniform(2,20);v=np.hypot(x-cx,y-cy);d=.60*np.exp(-(v/(rr*.92))**4)+.24*np.exp(-(v/(rr*1.8))**2);col=np.array([18,15,6]) if name in ('india','puppets','studio') else np.array([10,11,16]);im+=r.uniform(.2,2.3)*d[:,:,None]*col
 save('back-'+name,im+r.normal(0,1,(h,w,1)),85)
for seed in range(3):
 n=512;y,x=np.mgrid[0:n,0:n];X=(x-n/2)/(n/2);Y=(n*.9-y)/(n*.8);g=fb(n,n);det=noise(n,n,82);cloud=np.zeros((n,n));dust=np.zeros_like(cloud)
 for j in range(18):
  ang=r.uniform(-1.05,1.12);length=r.uniform(.32,.97);amp=r.uniform(.10,.27);bend=r.uniform(-.25,.25)
  for t in np.linspace(.05,1,18):
   cx=math.sin(ang)*length*t+bend*t*t+.045*math.sin(j+t*6)*t;cy=math.cos(ang)*length*t;rr=(.018+amp*t**.85)*(1-.52*t);z=((X-cx)/(rr*1.28))**2+((Y-cy)/(rr*.87))**2;cloud+=np.exp(-z*.65)*(.037+.08*(1-t))
 for k in range(10000):
  a=r.uniform(-1.12,1.12);d=r.beta(1.65,2)*1.13;sx=int((math.sin(a)*d+1)*n/2);sy=int(n*.9-math.cos(a)*d*n*.8)
  if 1<sx<n-2 and 1<sy<n-2:cv2.circle(dust,(sx,sy),int(r.choice([1,1,1,1,2])),r.uniform(.12,.86),-1)
 alpha=np.clip(1-np.exp(-np.maximum(0,cloud*(1+.50*g+.17*det)-.05)*2.4)+dust*.84,0,.99)*np.clip((Y+.06)/.27,0,1);st=np.clip(.77+.19*g+.13*det+r.normal(0,.07,cloud.shape),.3,1);save('pigment-plume-'+str(seed),np.dstack((st*248,st*247,st*249,alpha*255)),91)
y,x=np.mgrid[0:384,0:1024];f=fb(384,1024);q=113+15*np.sin(y*.16+1.5*np.sin(x*.009)+2.4*np.sin(x*.003+y*.027))+10*f+5*np.sin(y*.78+x*.008+f*2.3)+r.normal(0,3,(384,1024));save('walnut',np.dstack((q*1.3,q*.83,q*.49)),90)
