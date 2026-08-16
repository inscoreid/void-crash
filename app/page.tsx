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
const CONTRACT_ADDRESS = "0x3c244807034Dc8d647e147d01F3BB5906f5a8D71"; 

const BASE_MAINNET_PARAMS = {
  chainId: "0x2105", 
  chainName: "Base",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: ["https://mainnet.base.org"],
  blockExplorerUrls: ["https://basescan.org/"]
};

const ACHIEVEMENTS = [
  { id: 1, name: "8-клапанная ярость", cost: 100 },
  { id: 2, name: "Паук на 4 масти", cost: 300 },
  { id: 3, name: "Достать ножи", cost: 500 },
  { id: 4, name: "Запеченная лопатка", cost: 800 },
  { id: 5, name: "Гравитационная аномалия", cost: 1200 },
];

export default function VoidCrash() {
  const [account, setAccount] = useState("");
  const [status, setStatus] = useState("");
  const [chaosScore, setChaosScore] = useState(0);

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

  // Компонент физического объекта, который мы пинаем
  const BouncyScrap = () => {
    const rigidBodyRef = useRef<any>(null);

    const handleImpact = (e: any) => {
      e.stopPropagation();
      if (rigidBodyRef.current) {
        // Задаем дикий случайный импульс при клике
        const impulse = {
          x: (Math.random() - 0.5) * 60,
          y: 40 + Math.random() * 30,
          z: (Math.random() - 0.5) * 60
        };
        const torque = {
          x: (Math.random() - 0.5) * 20,
          y: (Math.random() - 0.5) * 20,
          z: (Math.random() - 0.5) * 20
        };
        
        rigidBodyRef.current.applyImpulse(impulse, true);
        rigidBodyRef.current.applyTorqueImpulse(torque, true);
        
        // Прибавляем очки хаоса
        setChaosScore(prev => prev + Math.floor(Math.random() * 15) + 10);
      }
    };

    return (
      <RigidBody ref={rigidBodyRef} colliders="cuboid" restitution={1.2} friction={0.1}>
        <mesh onClick={handleImpact} castShadow receiveShadow>
          <boxGeometry args={[1.5, 1.5, 1.5]} />
          <meshStandardMaterial color="#ea580c" roughness={0.2} metalness={0.8} />
        </mesh>
      </RigidBody>
    );
  };

  return (
    <main className="relative w-screen h-screen bg-zinc-950 overflow-hidden font-mono text-white">
      {/* 3D СЦЕНА НА ФОНЕ */}
      <div className="absolute inset-0 z-0 cursor-crosshair">
        <Canvas camera={{ position: [0, 5, 15], fov: 50 }}>
          <ambientLight intensity={0.5} />
          <directionalLight position={[10, 10, 10]} intensity={1} castShadow />
          <Environment preset="city" />
          
          <Physics gravity={[0, -20, 0]}>
            <BouncyScrap />
            
            {/* Невидимая коробка-ограничитель */}
            <RigidBody type="fixed" restitution={1}>
              <CuboidCollider position={[0, -2, 0]} args={[15, 0.5, 15]} /> {/* Пол */}
              <CuboidCollider position={[-15, 10, 0]} args={[0.5, 15, 15]} /> {/* Левая стена */}
              <CuboidCollider position={[15, 10, 0]} args={[0.5, 15, 15]} /> {/* Правая стена */}
              <CuboidCollider position={[0, 10, -15]} args={[15, 15, 0.5]} /> {/* Задняя стена */}
              <CuboidCollider position={[0, 10, 15]} args={[15, 15, 0.5]} /> {/* Передняя стена (для отскока) */}
              <CuboidCollider position={[0, 25, 0]} args={[15, 0.5, 15]} /> {/* Потолок */}
            </RigidBody>
          </Physics>
          
          <ContactShadows position={[0, -1.9, 0]} opacity={0.5} scale={40} blur={2} far={10} />
        </Canvas>
      </div>

      {/* ИНТЕРФЕЙС ПОВЕРХ 3D */}
      <div className="absolute top-0 left-0 w-full p-6 z-10 pointer-events-none">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-4xl font-black text-orange-500 drop-shadow-md">VOID CRASH</h1>
            <p className="text-zinc-400 text-sm mt-1">Кликай по кубу. Создавай хаос. Лутай ачивки.</p>
            <div className="mt-4 bg-zinc-900/80 p-4 rounded-lg border border-zinc-700 backdrop-blur-sm inline-block">
              <span className="text-zinc-400">Счетчик хаоса:</span>
              <span className="text-4xl font-bold text-white ml-3">{chaosScore}</span>
            </div>
          </div>

          <div className="pointer-events-auto">
            {!account ? (
              <button onClick={connectWallet} className="px-6 py-2 bg-white text-black font-bold rounded hover:bg-zinc-200">
                Connect Wallet
              </button>
            ) : (
              <div className="text-sm text-green-400 bg-zinc-900/80 px-4 py-2 rounded border border-zinc-700 backdrop-blur-sm">
                Connected: {account.slice(0,6)}...{account.slice(-4)}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* СПИСОК АЧИВОК СПРАВА */}
      <div className="absolute right-6 top-24 w-80 z-10 pointer-events-none">
        <div className="space-y-3">
          {ACHIEVEMENTS.map((ach) => {
            const isUnlocked = chaosScore >= ach.cost;
            return (
              <div key={ach.id} className={`p-4 rounded-lg border backdrop-blur-md pointer-events-auto transition-all ${
                isUnlocked ? 'bg-zinc-900/90 border-orange-500/50 shadow-[0_0_15px_rgba(234,88,12,0.2)]' : 'bg-zinc-900/50 border-zinc-800'
              }`}>
                <div className="flex justify-between items-center mb-2">
                  <span className={`font-bold ${isUnlocked ? 'text-orange-400' : 'text-zinc-600'}`}>{ach.name}</span>
                  <span className="text-xs text-zinc-500">Хаос: {ach.cost}</span>
                </div>
                <button 
                  onClick={() => claimAchievement(ach.id)}
                  disabled={!isUnlocked || !account}
                  className={`w-full py-2 text-xs font-bold rounded transition-colors ${
                    !isUnlocked ? 'bg-zinc-800 text-zinc-600 cursor-not-allowed' : 
                    !account ? 'bg-orange-600/50 text-white/50' : 'bg-orange-600 text-white hover:bg-orange-500'
                  }`}
                >
                  {isUnlocked ? (account ? "MINT IN BASE" : "Connect Wallet to Mint") : "LOCKED"}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* СТАТУС ТРАНЗАКЦИЙ ВНИЗУ */}
      {status && (
        <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 z-10">
          <div className="bg-zinc-900/90 border border-zinc-700 text-zinc-300 px-6 py-3 rounded-lg shadow-xl backdrop-blur-sm text-sm">
            {status}
          </div>
        </div>
      )}
    </main>
  );
}
