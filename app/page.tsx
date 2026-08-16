"use client";

import { useState, useRef, useEffect } from "react";
import { ethers } from "ethers";
import { Canvas } from "@react-three/fiber";
import { Physics, RigidBody, CuboidCollider } from "@react-three/rapier";
import { Environment, ContactShadows } from "@react-three/drei";

declare global {
  interface Window {
    ethereum?: any;
  }
}

const ACHIEVEMENTS_ABI = [
  "function claimAchievement(uint256 achievementId) external",
  "function hasAchievement(address, uint256) view returns (bool)"
];

// ВСТАВЬ АДРЕС НОВОГО КОНТРАКТА АЧИВОК СЮДА:
const CONTRACT_ADDRESS = "ТВОЙ_АДРЕС_КОНТРАКТА"; 

const BASE_MAINNET_PARAMS = {
  chainId: "0x2105", 
  chainName: "Base",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: ["https://mainnet.base.org"],
  blockExplorerUrls: ["https://basescan.org/"]
};

// Цены выросли до небес. Теперь это вызов.
const ACHIEVEMENTS = [
  { id: 1, name: "8-клапанная ярость", cost: 1000 },
  { id: 2, name: "Паук на 4 масти", cost: 5000 },
  { id: 3, name: "Достать ножи", cost: 15000 },
  { id: 4, name: "Запеченная лопатка", cost: 50000 },
  { id: 5, name: "Гравитационная аномалия", cost: 100000 },
];

export default function VoidCrash() {
  const [account, setAccount] = useState("");
  const [status, setStatus] = useState("");
  const [chaosScore, setChaosScore] = useState(0);
  
  // Добавляем систему комбо
  const [combo, setCombo] = useState(1);
  const comboTimer = useRef<NodeJS.Timeout | null>(null);

  const checkAndSwitchNetwork = async () => {
    if (!window.ethereum) return false;
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const network = await provider.getNetwork();
      if (network.chainId !== BigInt(8453)) {
        await window.ethereum.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: BASE_MAINNET_PARAMS.chainId }],
        });
      }
      return true;
    } catch (error) {
      console.error(error);
      return false;
    }
  };

  const connectWallet = async () => {
    if (window.ethereum) {
      try {
        const isCorrectNetwork = await checkAndSwitchNetwork();
        if (!isCorrectNetwork) return;
        const provider = new ethers.BrowserProvider(window.ethereum);
        const accounts = await provider.send("eth_requestAccounts", []);
        setAccount(accounts[0]);
      } catch (error) {
        console.error(error);
      }
    }
  };

  const claimAchievement = async (id: number) => {
    try {
      setStatus("Подписание транзакции...");
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, ACHIEVEMENTS_ABI, signer);
      
      const tx = await contract.claimAchievement(id);
      setStatus("Транзакция отправлена! Ждем...");
      await tx.wait();
      setStatus("✅ Ачивка успешно вписана в блокчейн Base!");
    } catch (err: unknown) {
      setStatus("❌ Ошибка: " + (err instanceof Error ? err.message : "Транзакция отклонена"));
    }
  };

  // Наш безумный куб
  const BouncyScrap = () => {
    const rigidBodyRef = useRef<any>(null);

    const handleImpact = (e: any) => {
      e.stopPropagation();
      if (rigidBodyRef.current) {
        // Увеличиваем комбо
        const newCombo = combo + 1;
        setCombo(newCombo);
        
        // Сила удара растет вместе с комбо (но имеет кап)
        const forceMultiplier = Math.min(newCombo * 10, 200) + 100;
        
        // Вектор силы: всегда толкаем от нас (вглубь экрана -z) и вверх (+y)
        // Хаос по X добавляет случайных рикошетов от стен
        const impulse = {
          x: (Math.random() - 0.5) * forceMultiplier,
          y: (Math.random() * 0.5 + 0.8) * forceMultiplier, 
          z: -(Math.random() * 0.5 + 0.5) * forceMultiplier 
        };
        
        // МАГИЯ ЗДЕСЬ: Бьем ровно в ту точку 3D-модели, куда пришелся клик мыши!
        // Это заставит куб бешено вращаться и отлетать по законам физики.
        rigidBodyRef.current.applyImpulseAtPoint(impulse, e.point, true);
        
        // Даем очки с умножением на комбо
        setChaosScore(prev => prev + (10 * newCombo));

        // Таймер сброса комбо (1.2 секунды чтобы успеть кликнуть снова в полете)
        if (comboTimer.current) clearTimeout(comboTimer.current);
        comboTimer.current = setTimeout(() => {
          setCombo(1);
        }, 1200);
      }
    };

    // Куб меняет цвет от нагрева (чем выше комбо, тем он краснее)
    const cubeColor = combo > 20 ? "#ef4444" : combo > 10 ? "#f97316" : "#ea580c";

    return (
      <RigidBody ref={rigidBodyRef} colliders="cuboid" restitution={1.5} friction={0.1}>
        <mesh onClick={handleImpact} castShadow receiveShadow>
          <boxGeometry args={[1.5, 1.5, 1.5]} />
          <meshStandardMaterial color={cubeColor} roughness={0.2} metalness={0.8} />
        </mesh>
      </RigidBody>
    );
  };

  return (
    <main className="relative w-screen h-screen bg-zinc-950 overflow-hidden font-mono text-white select-none">
      <div className="absolute inset-0 z-0 cursor-crosshair">
        <Canvas camera={{ position: [0, 5, 18], fov: 50 }}>
          <ambientLight intensity={0.5} />
          <directionalLight position={[10, 10, 10]} intensity={1} castShadow />
          <Environment preset="city" />
          
          {/* Снизили гравитацию, чтобы куб больше зависал в воздухе */}
          <Physics gravity={[0, -12, 0]}>
            <BouncyScrap />
            
            <RigidBody type="fixed" restitution={1.2}>
              <CuboidCollider position={[0, -2, 0]} args={[15, 0.5, 15]} /> 
              <CuboidCollider position={[-10, 10, 0]} args={[0.5, 15, 15]} /> 
              <CuboidCollider position={[10, 10, 0]} args={[0.5, 15, 15]} /> 
              <CuboidCollider position={[0, 10, -10]} args={[15, 15, 0.5]} /> 
              <CuboidCollider position={[0, 10, 15]} args={[15, 15, 0.5]} /> 
              <CuboidCollider position={[0, 25, 0]} args={[15, 0.5, 15]} /> 
            </RigidBody>
          </Physics>
          
          <ContactShadows position={[0, -1.9, 0]} opacity={0.5} scale={40} blur={2} far={10} />
        </Canvas>
      </div>

      <div className="absolute top-0 left-0 w-full p-6 z-10 pointer-events-none flex justify-between items-start">
        <div>
          <h1 className="text-4xl font-black text-orange-500 drop-shadow-md">VOID CRASH</h1>
          <p className="text-zinc-400 text-sm mt-1">Жонглируй кубом. Не дай ему упасть.</p>
          
          <div className="mt-4 flex gap-4">
            <div className="bg-zinc-900/90 p-4 rounded-lg border border-zinc-700 backdrop-blur-sm shadow-lg">
              <span className="text-zinc-400 block text-xs uppercase mb-1">Очки хаоса</span>
              <span className="text-3xl font-bold text-white">{chaosScore.toLocaleString()}</span>
            </div>
            
            <div className={`p-4 rounded-lg border backdrop-blur-sm shadow-lg transition-colors ${combo > 1 ? 'bg-orange-950/80 border-orange-500/50' : 'bg-zinc-900/90 border-zinc-700'}`}>
              <span className="text-zinc-400 block text-xs uppercase mb-1">Множитель</span>
              <span className={`text-3xl font-black ${combo > 1 ? 'text-orange-500 animate-pulse' : 'text-zinc-500'}`}>
                x{combo}
              </span>
            </div>
          </div>
        </div>

        <div className="pointer-events-auto">
          {!account ? (
            <button onClick={connectWallet} className="px-6 py-2 bg-white text-black font-bold rounded hover:bg-zinc-200 shadow-xl">
              Connect Wallet
            </button>
          ) : (
            <div className="text-sm text-green-400 bg-zinc-900/90 px-4 py-2 rounded border border-zinc-700 backdrop-blur-sm shadow-xl">
              Connected: {account.slice(0,6)}...{account.slice(-4)}
            </div>
          )}
        </div>
      </div>

      <div className="absolute right-6 top-24 w-80 z-10 pointer-events-none">
        <div className="space-y-3">
          {ACHIEVEMENTS.map((ach) => {
            const isUnlocked = chaosScore >= ach.cost;
            return (
              <div key={ach.id} className={`p-4 rounded-lg border backdrop-blur-md pointer-events-auto transition-all ${
                isUnlocked ? 'bg-zinc-900/95 border-orange-500/50 shadow-[0_0_20px_rgba(234,88,12,0.3)] scale-105' : 'bg-zinc-900/60 border-zinc-800'
              }`}>
                <div className="flex justify-between items-center mb-2">
                  <span className={`font-bold ${isUnlocked ? 'text-orange-400' : 'text-zinc-600'}`}>{ach.name}</span>
                  <span className="text-xs text-zinc-500 font-bold">{ach.cost.toLocaleString()}</span>
                </div>
                <button 
                  onClick={() => claimAchievement(ach.id)}
                  disabled={!isUnlocked || !account}
                  className={`w-full py-2 text-xs font-black uppercase tracking-wider rounded transition-all ${
                    !isUnlocked ? 'bg-zinc-800 text-zinc-600 cursor-not-allowed' : 
                    !account ? 'bg-orange-900/50 text-orange-200/50' : 'bg-orange-600 text-white hover:bg-orange-500 hover:shadow-[0_0_15px_rgba(234,88,12,0.5)]'
                  }`}
                >
                  {isUnlocked ? (account ? "MINT IN BASE" : "Connect to Mint") : "LOCKED"}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {status && (
        <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 z-10 pointer-events-none">
          <div className="bg-zinc-900/95 border border-zinc-700 text-orange-400 font-bold px-6 py-3 rounded-lg shadow-2xl backdrop-blur-sm text-sm">
            {status}
          </div>
        </div>
      )}
    </main>
  );
}
