from PIL import Image
import numpy as np,cv2,scipy.ndimage as nd,pathlib,skimage.measure as measure,base64,json,vtk
from vtk.util import numpy_support as vt
out=pathlib.Path(__file__).resolve().parents[2];rng=np.random.default_rng(107)
def n(h,w,x,y):return cv2.resize(rng.standard_normal((y,x)).astype('f'),(w,h),interpolation=cv2.INTER_CUBIC)
h,w=448,3072; y,x=np.mgrid[0:h,0:w];xx=x/w;yy=1-y/h
f=.44*n(h,w,25,4)+.3*n(h,w,55,10)+.19*n(h,w,100,18)+.12*n(h,w,210,35)+.035*rng.standard_normal((h,w));fine=n(h,w,470,67);g=rng.standard_normal((h,w));clay=np.array([206,120,64]);
def blend(a,b,k):return a*(1-k[:,:,None])+np.array(b)*k[:,:,None]
def edge(t):return np.clip(t+.5,0,1)
def put(key,p):Image.fromarray(np.uint8(np.clip(p,0,255))).save(out/'images'/'atelier'/('paint-'+key+'.webp'),quality=92)
var=(1+.084*f+.035*fine+.029*g)[:,:,None];line=yy+f*.065+fine*.013
p=blend(np.array([46,105,42]),[244,227,190],edge((line-.335)*16));p=blend(p,[242,133,39],edge((line-.675)*16));put('india',p*var)
p=blend(np.array([44,77,163]),[244,226,203],edge((xx-.329+f*.008)*90));p=blend(p,[193,48,41],edge((xx-.657+f*.009)*90));put('france',p*var)
# Pigments are deposited in clouds, with coarse islands of bare fired clay underneath.
p=np.zeros((h,w,3))+clay;palette=np.array([[248,38,139],[251,173,15],[245,66,60],[192,31,158],[90,64,210],[248,161,11],[234,43,111],[242,98,21]])
field=(xx*7.3+.34*yy+.32*f+.18*np.sin(yy*5+xx*17));idx=np.floor(field).astype(int);p1=palette[idx%len(palette)];p2=palette[(idx+1)%len(palette)];s=edge(((field%1)-.52)*3);p=blend(p1,p2,s);bare=edge((.55*yy-.16+f*.65+fine*.13-.13)*2.4);p=blend(p,np.array([221,140,65]),bare*.72);put('holi',p*var)
# True shell geometry: cut the eyes, nose and jagged mouth through a ribbed hollow gourd.
N=97;lo=-1.14;grid=np.linspace(lo,-lo,N);X,Y,Z=np.meshgrid(grid,grid,grid,indexing='ij');a=np.arctan2(Z,X);rr=np.hypot(X,Z);rad=1+.075*np.cos(11*a+.2*Y)+.024*np.cos(5*a-.7);shape=np.sqrt((rr/rad)**2+((Y+.015*np.cos(3*a)*np.minimum(rr,1))/.84)**2)-1
outer=np.maximum(shape,-shape-.095);H,W=450,450;mask=np.zeros((H,W),np.uint8)
def cut(poly):cv2.fillPoly(mask,[np.int32([[(a+1.14)/2.28*(W-1),(b+1.14)/2.28*(H-1)] for a,b in poly])],1)
cut([[-.66,.11],[-.23,.08],[-.43,.45]]);cut([[.20,.10],[.67,.17],[.40,.44]]);cut([[-.10,-.058],[.12,-.058],[.015,.124]]);cut([[-.72,-.16],[-.48,-.23],[-.32,-.25],[-.32,-.33],[-.18,-.34],[-.18,-.26],[.09,-.26],[.08,-.34],[.20,-.32],[.21,-.25],[.46,-.20],[.69,-.105],[.54,-.36],[.30,-.46],[.18,-.47],[.18,-.41],[.031,-.42],[.03,-.49],[-.22,-.47],[-.46,-.40],[-.62,-.32]])
sdf=(nd.distance_transform_edt(~mask.astype(bool))-nd.distance_transform_edt(mask))/(W-1)*2.28;sdf=cv2.resize(sdf.astype('f'),(N,N),interpolation=cv2.INTER_LINEAR).T;carve=np.maximum(sdf[:,:,None],.32-Z);vol=np.maximum(outer,-carve);v,t,_,_=measure.marching_cubes(vol.astype('f'),level=0,spacing=(2.28/(N-1),)*3,gradient_direction='ascent');v+=lo
# VTK retains the shape of the cuts while reducing mesh weight.
poly=vtk.vtkPolyData();p=vtk.vtkPoints();p.SetData(vt.numpy_to_vtk(v.astype('f'),deep=1));poly.SetPoints(p);ca=vtk.vtkCellArray();ca.SetData(vt.numpy_to_vtkIdTypeArray(np.arange(0,3*(len(t)+1),3,dtype=np.int64)),vt.numpy_to_vtkIdTypeArray(t.astype(np.int64).flatten()));poly.SetPolys(ca);dec=vtk.vtkQuadricDecimation();dec.SetInputData(poly);dec.SetTargetReduction(.78);dec.Update();o=dec.GetOutput();v=vt.vtk_to_numpy(o.GetPoints().GetData());t=vt.vtk_to_numpy(o.GetPolys().GetConnectivityArray()).reshape(-1,3)
# Face winding for outward normals
import trimesh
if trimesh.Trimesh(v,t,process=False).volume<0:t=t[:,::-1].copy()
pack=lambda a:base64.b64encode(a.tobytes()).decode();(out/'js/clay/carving.js').write_text('window.CarvedGourd='+json.dumps([pack(np.rint(v*12000).astype('<i2')),pack(t.astype('<u2'))])+';');print(len(v),len(t))
