import numpy as np, wave
from scipy.signal import butter, sosfilt, sosfilt_zi
SR=44100; L=24.0; X=2.0
N=int(SR*L); NX=int(SR*(L+X)); rng=np.random.default_rng(7)
t=np.arange(NX)/SR
def pink(n):
    w=rng.standard_normal(n); f=np.fft.rfftfreq(n,1/SR); s=np.fft.rfft(w); f[0]=f[1]; s/=np.sqrt(f); p=np.fft.irfft(s,n); return p/np.max(np.abs(p))
def tv_filter(x,kind,fc,q=None,block=512):
    out=np.zeros_like(x); zi=None
    for i in range(0,len(x),block):
        c=float(np.clip(fc[i],40,SR/2-1000))
        if kind=='band': sos=butter(1,[max(30,c/(1+0.5/q)),c*(1+0.5/q)],btype='band',fs=SR,output='sos')
        else: sos=butter(2,c,btype=kind,fs=SR,output='sos')
        if zi is None: zi=sosfilt_zi(sos)*x[0]
        y,zi=sosfilt(sos,x[i:i+block],zi=zi); out[i:i+block]=y
    return out
def pan(sig,p):
    a=(p+1)*np.pi/4; return np.stack([sig*np.cos(a),sig*np.sin(a)],1)
def loopify(cont):  # cont: NX x 2 -> N x 2 with crossfade
    out=cont[:N].copy(); nx=NX-N; fi=np.linspace(0,1,nx)[:,None]
    out[:nx]=cont[:nx]*fi+cont[N:NX]*(1-fi); return out
def add_circ(buf,start,sig):  # sig n x 2
    for k in range(len(sig)):
        pass
    idx=(start+np.arange(len(sig)))%N; np.add.at(buf,idx,sig)
def stereo_noise(): c=pink(NX); return c, 0.8*c+0.2*pink(NX), 0.8*c+0.2*pink(NX)
TWO=2*np.pi
# ---- Tempestade
_,nl,nr=stereo_noise(); f=2/24
fc=650+380*np.sin(TWO*f*t); amp=0.55+0.45*np.sin(TWO*f*t)
wl=tv_filter(nl,'low',fc)*amp; wr=tv_filter(nr,'low',fc)*amp
wl/=np.max(np.abs(wl)); wr/=np.max(np.abs(wr))
temp=np.stack([wl,wr],1)*0.5
temp[:,0]+=0.045*np.sin(TWO*200*t); temp[:,1]+=0.045*np.sin(TWO*204*t)
temp=loopify(temp)*0.9
# ---- Névoa
_,nl,nr=stereo_noise(); fc=520+260*np.sin(TWO*t/24); amp=0.28+0.12*np.sin(TWO*2*t/24)
bl=tv_filter(nl,'band',fc,0.8); br=tv_filter(nr,'band',fc,0.8); m=max(np.max(np.abs(bl)),np.max(np.abs(br)))
nev=loopify(np.stack([bl,br],1)/m*amp[:,None]*0.6)
CH=[[130.81,196.0,261.63,329.63],[110.0,164.81,220.0,261.63],[87.31,174.61,220.0,261.63],[98.0,146.83,196.0,246.94]]; PAT=[0,1,2,3,2,1]
ev=np.zeros((N,2))
def pluck(freq,dur=3.0):
    n=int(round(SR/freq)); L2=int(SR*dur); ring=rng.uniform(-1,1,n); ring=(ring+np.roll(ring,1)+np.roll(ring,-1))/3; out=np.empty(L2)
    for i in range(L2):
        j=i%n; nx=(j+1)%n; out[i]=ring[j]; ring[j]=0.5*(ring[j]+ring[nx])*0.9965
    a=int(SR*0.004); out[:a]*=np.linspace(0,1,a)
    return out
cache={}
for k in range(24):
    ch=CH[(k//6)%4]; idx=PAT[k%6]; fq=ch[idx]
    if fq not in cache: cache[fq]=pluck(fq)
    add_circ(ev,int((k*1.0+0.25)*SR),pan(cache[fq]*0.32,(idx-1.5)*0.25))
nev=nev+ev
# ---- Clareira
_,nl,nr=stereo_noise(); amp=0.05+0.03*np.sin(TWO*3*t/24)
hl=tv_filter(nl,'high',np.full(NX,2800.0)); hr=tv_filter(nr,'high',np.full(NX,2800.0)); m=max(np.max(np.abs(hl)),np.max(np.abs(hr)))
leaves=np.stack([hl,hr],1)/m*amp[:,None]*1.6
padsig=np.zeros(NX)
for k,fq in enumerate([174.61,220,261.63,349.23]):
    vib=5*np.sin(TWO*(0.05+k*0.013)*t)  # cents
    inst=fq*2**(((k-1.5)*4+vib)/1200); ph=TWO*np.cumsum(inst)/SR; padsig+=np.sin(ph)
padsig*=0.05*(1+0.4*np.sin(TWO*t/24))
clar=loopify(leaves+np.stack([padsig,padsig],1))
bev=np.zeros((N,2)); tt=0.5
while tt<L:
    n=2+rng.integers(0,3); p=rng.uniform(-0.8,0.8)
    for k in range(n):
        st=tt+0.05+k*(0.13+rng.uniform(0,0.06)); f0=2600+rng.uniform(0,1400); d=0.15; ts=np.arange(int(SR*d))/SR
        fr=np.where(ts<0.05,f0*(1.45**(ts/0.05)),f0*1.45*((0.95/1.45)**np.clip((ts-0.05)/0.06,0,1)))
        env=np.where(ts<0.012,ts/0.012*0.045,0.045*np.exp(-(ts-0.012)/0.02))
        sig=np.sin(TWO*np.cumsum(fr)/SR)*env; add_circ(bev,int(st*SR),pan(sig,p))
    tt+=2.5+rng.uniform(0,4)
clar=clar+bev
# ---- normalize together (preserve balance)
peak=max(np.max(np.abs(temp)),np.max(np.abs(nev)),np.max(np.abs(clar)))
g=0.89/peak
def write(name,data):
    d=np.clip(data,-1,1); pcm=(d*32767).astype('<i2')
    with wave.open(name,'wb') as w: w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
write('tempestade_loop.wav',temp*g); write('nevoa_loop.wav',nev*g); write('clareira_loop.wav',clar*g)
# ping test 2.4s loop
P=int(SR*2.4); pg=np.zeros((P,2)); ts=np.arange(int(SR*0.65))/SR
env=np.where(ts<0.02,ts/0.02*0.18,0.18*np.exp(-(ts-0.02)/0.11)); s=np.sin(TWO*523.25*ts)*env/0.18*0.6
pg[:len(s)]+=pan(s,-1); pg[int(1.2*SR):int(1.2*SR)+len(s)]+=pan(s,1)
write('teste_fone_loop.wav',pg)
print('peak gain',g)
