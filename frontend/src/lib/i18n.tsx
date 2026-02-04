'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';

// ============================================================================
// Types
// ============================================================================

export type SupportedLocale = 'en' | 'es' | 'fr' | 'de' | 'ja' | 'zh' | 'ko' | 'pt';

export interface TranslationValues {
  [key: string]: string | number;
}

export interface LocaleConfig {
  code: SupportedLocale;
  name: string;
  nativeName: string;
  flag: string;
  dateFormat: string;
  numberFormat: {
    decimal: string;
    thousands: string;
  };
  currency: {
    symbol: string;
    position: 'before' | 'after';
  };
}

// ============================================================================
// Locale Configurations
// ============================================================================

export const LOCALE_CONFIGS: Record<SupportedLocale, LocaleConfig> = {
  en: {
    code: 'en',
    name: 'English',
    nativeName: 'English',
    flag: '🇺🇸',
    dateFormat: 'MM/DD/YYYY',
    numberFormat: { decimal: '.', thousands: ',' },
    currency: { symbol: '$', position: 'before' },
  },
  es: {
    code: 'es',
    name: 'Spanish',
    nativeName: 'Español',
    flag: '🇪🇸',
    dateFormat: 'DD/MM/YYYY',
    numberFormat: { decimal: ',', thousands: '.' },
    currency: { symbol: '€', position: 'after' },
  },
  fr: {
    code: 'fr',
    name: 'French',
    nativeName: 'Français',
    flag: '🇫🇷',
    dateFormat: 'DD/MM/YYYY',
    numberFormat: { decimal: ',', thousands: ' ' },
    currency: { symbol: '€', position: 'after' },
  },
  de: {
    code: 'de',
    name: 'German',
    nativeName: 'Deutsch',
    flag: '🇩🇪',
    dateFormat: 'DD.MM.YYYY',
    numberFormat: { decimal: ',', thousands: '.' },
    currency: { symbol: '€', position: 'after' },
  },
  ja: {
    code: 'ja',
    name: 'Japanese',
    nativeName: '日本語',
    flag: '🇯🇵',
    dateFormat: 'YYYY/MM/DD',
    numberFormat: { decimal: '.', thousands: ',' },
    currency: { symbol: '¥', position: 'before' },
  },
  zh: {
    code: 'zh',
    name: 'Chinese',
    nativeName: '中文',
    flag: '🇨🇳',
    dateFormat: 'YYYY-MM-DD',
    numberFormat: { decimal: '.', thousands: ',' },
    currency: { symbol: '¥', position: 'before' },
  },
  ko: {
    code: 'ko',
    name: 'Korean',
    nativeName: '한국어',
    flag: '🇰🇷',
    dateFormat: 'YYYY.MM.DD',
    numberFormat: { decimal: '.', thousands: ',' },
    currency: { symbol: '₩', position: 'before' },
  },
  pt: {
    code: 'pt',
    name: 'Portuguese',
    nativeName: 'Português',
    flag: '🇧🇷',
    dateFormat: 'DD/MM/YYYY',
    numberFormat: { decimal: ',', thousands: '.' },
    currency: { symbol: 'R$', position: 'before' },
  },
};

// ============================================================================
// Translations
// ============================================================================

type TranslationKey = 
  | 'common.loading'
  | 'common.error'
  | 'common.success'
  | 'common.cancel'
  | 'common.confirm'
  | 'common.save'
  | 'common.delete'
  | 'common.edit'
  | 'common.create'
  | 'common.close'
  | 'common.back'
  | 'common.next'
  | 'common.search'
  | 'common.filter'
  | 'common.sort'
  | 'common.refresh'
  | 'common.noResults'
  | 'common.viewAll'
  | 'common.learnMore'
  | 'nav.home'
  | 'nav.positions'
  | 'nav.staking'
  | 'nav.governance'
  | 'nav.profile'
  | 'nav.settings'
  | 'wallet.connect'
  | 'wallet.disconnect'
  | 'wallet.connected'
  | 'wallet.notConnected'
  | 'wallet.balance'
  | 'wallet.copyAddress'
  | 'wallet.addressCopied'
  | 'positions.title'
  | 'positions.create'
  | 'positions.createNew'
  | 'positions.noPositions'
  | 'positions.locked'
  | 'positions.unlocking'
  | 'positions.unlocked'
  | 'positions.cancelled'
  | 'positions.amount'
  | 'positions.unlockDate'
  | 'positions.beneficiary'
  | 'positions.withdraw'
  | 'positions.transfer'
  | 'positions.details'
  | 'staking.title'
  | 'staking.stake'
  | 'staking.unstake'
  | 'staking.claim'
  | 'staking.rewards'
  | 'staking.totalStaked'
  | 'staking.yourStake'
  | 'staking.tier'
  | 'staking.apy'
  | 'governance.title'
  | 'governance.proposals'
  | 'governance.createProposal'
  | 'governance.vote'
  | 'governance.voteFor'
  | 'governance.voteAgainst'
  | 'governance.abstain'
  | 'governance.votingPower'
  | 'governance.delegate'
  | 'governance.active'
  | 'governance.passed'
  | 'governance.rejected'
  | 'governance.executed'
  | 'time.seconds'
  | 'time.minutes'
  | 'time.hours'
  | 'time.days'
  | 'time.weeks'
  | 'time.months'
  | 'time.years'
  | 'time.ago'
  | 'time.remaining'
  | 'errors.generic'
  | 'errors.network'
  | 'errors.walletNotConnected'
  | 'errors.insufficientFunds'
  | 'errors.transactionFailed'
  | 'errors.invalidInput';

type Translations = Record<TranslationKey, string>;

const translations: Record<SupportedLocale, Translations> = {
  en: {
    'common.loading': 'Loading...',
    'common.error': 'Error',
    'common.success': 'Success',
    'common.cancel': 'Cancel',
    'common.confirm': 'Confirm',
    'common.save': 'Save',
    'common.delete': 'Delete',
    'common.edit': 'Edit',
    'common.create': 'Create',
    'common.close': 'Close',
    'common.back': 'Back',
    'common.next': 'Next',
    'common.search': 'Search',
    'common.filter': 'Filter',
    'common.sort': 'Sort',
    'common.refresh': 'Refresh',
    'common.noResults': 'No results found',
    'common.viewAll': 'View All',
    'common.learnMore': 'Learn More',
    'nav.home': 'Home',
    'nav.positions': 'Positions',
    'nav.staking': 'Staking',
    'nav.governance': 'Governance',
    'nav.profile': 'Profile',
    'nav.settings': 'Settings',
    'wallet.connect': 'Connect Wallet',
    'wallet.disconnect': 'Disconnect',
    'wallet.connected': 'Connected',
    'wallet.notConnected': 'Not Connected',
    'wallet.balance': 'Balance',
    'wallet.copyAddress': 'Copy Address',
    'wallet.addressCopied': 'Address Copied!',
    'positions.title': 'Your Positions',
    'positions.create': 'Create Position',
    'positions.createNew': 'Create New Position',
    'positions.noPositions': 'No positions yet',
    'positions.locked': 'Locked',
    'positions.unlocking': 'Unlocking',
    'positions.unlocked': 'Unlocked',
    'positions.cancelled': 'Cancelled',
    'positions.amount': 'Amount',
    'positions.unlockDate': 'Unlock Date',
    'positions.beneficiary': 'Beneficiary',
    'positions.withdraw': 'Withdraw',
    'positions.transfer': 'Transfer',
    'positions.details': 'View Details',
    'staking.title': 'Staking',
    'staking.stake': 'Stake',
    'staking.unstake': 'Unstake',
    'staking.claim': 'Claim Rewards',
    'staking.rewards': 'Rewards',
    'staking.totalStaked': 'Total Staked',
    'staking.yourStake': 'Your Stake',
    'staking.tier': 'Tier',
    'staking.apy': 'APY',
    'governance.title': 'Governance',
    'governance.proposals': 'Proposals',
    'governance.createProposal': 'Create Proposal',
    'governance.vote': 'Vote',
    'governance.voteFor': 'Vote For',
    'governance.voteAgainst': 'Vote Against',
    'governance.abstain': 'Abstain',
    'governance.votingPower': 'Voting Power',
    'governance.delegate': 'Delegate',
    'governance.active': 'Active',
    'governance.passed': 'Passed',
    'governance.rejected': 'Rejected',
    'governance.executed': 'Executed',
    'time.seconds': 'seconds',
    'time.minutes': 'minutes',
    'time.hours': 'hours',
    'time.days': 'days',
    'time.weeks': 'weeks',
    'time.months': 'months',
    'time.years': 'years',
    'time.ago': 'ago',
    'time.remaining': 'remaining',
    'errors.generic': 'Something went wrong',
    'errors.network': 'Network error. Please try again.',
    'errors.walletNotConnected': 'Please connect your wallet',
    'errors.insufficientFunds': 'Insufficient funds',
    'errors.transactionFailed': 'Transaction failed',
    'errors.invalidInput': 'Invalid input',
  },
  es: {
    'common.loading': 'Cargando...',
    'common.error': 'Error',
    'common.success': 'Éxito',
    'common.cancel': 'Cancelar',
    'common.confirm': 'Confirmar',
    'common.save': 'Guardar',
    'common.delete': 'Eliminar',
    'common.edit': 'Editar',
    'common.create': 'Crear',
    'common.close': 'Cerrar',
    'common.back': 'Atrás',
    'common.next': 'Siguiente',
    'common.search': 'Buscar',
    'common.filter': 'Filtrar',
    'common.sort': 'Ordenar',
    'common.refresh': 'Actualizar',
    'common.noResults': 'No se encontraron resultados',
    'common.viewAll': 'Ver Todo',
    'common.learnMore': 'Más Información',
    'nav.home': 'Inicio',
    'nav.positions': 'Posiciones',
    'nav.staking': 'Staking',
    'nav.governance': 'Gobernanza',
    'nav.profile': 'Perfil',
    'nav.settings': 'Configuración',
    'wallet.connect': 'Conectar Cartera',
    'wallet.disconnect': 'Desconectar',
    'wallet.connected': 'Conectado',
    'wallet.notConnected': 'No Conectado',
    'wallet.balance': 'Saldo',
    'wallet.copyAddress': 'Copiar Dirección',
    'wallet.addressCopied': '¡Dirección Copiada!',
    'positions.title': 'Tus Posiciones',
    'positions.create': 'Crear Posición',
    'positions.createNew': 'Crear Nueva Posición',
    'positions.noPositions': 'Aún no hay posiciones',
    'positions.locked': 'Bloqueado',
    'positions.unlocking': 'Desbloqueando',
    'positions.unlocked': 'Desbloqueado',
    'positions.cancelled': 'Cancelado',
    'positions.amount': 'Cantidad',
    'positions.unlockDate': 'Fecha de Desbloqueo',
    'positions.beneficiary': 'Beneficiario',
    'positions.withdraw': 'Retirar',
    'positions.transfer': 'Transferir',
    'positions.details': 'Ver Detalles',
    'staking.title': 'Staking',
    'staking.stake': 'Depositar',
    'staking.unstake': 'Retirar',
    'staking.claim': 'Reclamar Recompensas',
    'staking.rewards': 'Recompensas',
    'staking.totalStaked': 'Total Depositado',
    'staking.yourStake': 'Tu Depósito',
    'staking.tier': 'Nivel',
    'staking.apy': 'APY',
    'governance.title': 'Gobernanza',
    'governance.proposals': 'Propuestas',
    'governance.createProposal': 'Crear Propuesta',
    'governance.vote': 'Votar',
    'governance.voteFor': 'Votar a Favor',
    'governance.voteAgainst': 'Votar en Contra',
    'governance.abstain': 'Abstenerse',
    'governance.votingPower': 'Poder de Voto',
    'governance.delegate': 'Delegar',
    'governance.active': 'Activo',
    'governance.passed': 'Aprobado',
    'governance.rejected': 'Rechazado',
    'governance.executed': 'Ejecutado',
    'time.seconds': 'segundos',
    'time.minutes': 'minutos',
    'time.hours': 'horas',
    'time.days': 'días',
    'time.weeks': 'semanas',
    'time.months': 'meses',
    'time.years': 'años',
    'time.ago': 'hace',
    'time.remaining': 'restante',
    'errors.generic': 'Algo salió mal',
    'errors.network': 'Error de red. Por favor intenta de nuevo.',
    'errors.walletNotConnected': 'Por favor conecta tu cartera',
    'errors.insufficientFunds': 'Fondos insuficientes',
    'errors.transactionFailed': 'Transacción fallida',
    'errors.invalidInput': 'Entrada inválida',
  },
  fr: {
    'common.loading': 'Chargement...',
    'common.error': 'Erreur',
    'common.success': 'Succès',
    'common.cancel': 'Annuler',
    'common.confirm': 'Confirmer',
    'common.save': 'Enregistrer',
    'common.delete': 'Supprimer',
    'common.edit': 'Modifier',
    'common.create': 'Créer',
    'common.close': 'Fermer',
    'common.back': 'Retour',
    'common.next': 'Suivant',
    'common.search': 'Rechercher',
    'common.filter': 'Filtrer',
    'common.sort': 'Trier',
    'common.refresh': 'Actualiser',
    'common.noResults': 'Aucun résultat trouvé',
    'common.viewAll': 'Voir Tout',
    'common.learnMore': 'En Savoir Plus',
    'nav.home': 'Accueil',
    'nav.positions': 'Positions',
    'nav.staking': 'Staking',
    'nav.governance': 'Gouvernance',
    'nav.profile': 'Profil',
    'nav.settings': 'Paramètres',
    'wallet.connect': 'Connecter Portefeuille',
    'wallet.disconnect': 'Déconnecter',
    'wallet.connected': 'Connecté',
    'wallet.notConnected': 'Non Connecté',
    'wallet.balance': 'Solde',
    'wallet.copyAddress': 'Copier Adresse',
    'wallet.addressCopied': 'Adresse Copiée!',
    'positions.title': 'Vos Positions',
    'positions.create': 'Créer Position',
    'positions.createNew': 'Créer Nouvelle Position',
    'positions.noPositions': 'Pas encore de positions',
    'positions.locked': 'Verrouillé',
    'positions.unlocking': 'Déverrouillage',
    'positions.unlocked': 'Déverrouillé',
    'positions.cancelled': 'Annulé',
    'positions.amount': 'Montant',
    'positions.unlockDate': 'Date de Déverrouillage',
    'positions.beneficiary': 'Bénéficiaire',
    'positions.withdraw': 'Retirer',
    'positions.transfer': 'Transférer',
    'positions.details': 'Voir Détails',
    'staking.title': 'Staking',
    'staking.stake': 'Staker',
    'staking.unstake': 'Déstocker',
    'staking.claim': 'Réclamer Récompenses',
    'staking.rewards': 'Récompenses',
    'staking.totalStaked': 'Total Staké',
    'staking.yourStake': 'Votre Stake',
    'staking.tier': 'Niveau',
    'staking.apy': 'APY',
    'governance.title': 'Gouvernance',
    'governance.proposals': 'Propositions',
    'governance.createProposal': 'Créer Proposition',
    'governance.vote': 'Voter',
    'governance.voteFor': 'Voter Pour',
    'governance.voteAgainst': 'Voter Contre',
    'governance.abstain': 'S\'abstenir',
    'governance.votingPower': 'Pouvoir de Vote',
    'governance.delegate': 'Déléguer',
    'governance.active': 'Actif',
    'governance.passed': 'Adopté',
    'governance.rejected': 'Rejeté',
    'governance.executed': 'Exécuté',
    'time.seconds': 'secondes',
    'time.minutes': 'minutes',
    'time.hours': 'heures',
    'time.days': 'jours',
    'time.weeks': 'semaines',
    'time.months': 'mois',
    'time.years': 'années',
    'time.ago': 'il y a',
    'time.remaining': 'restant',
    'errors.generic': 'Quelque chose s\'est mal passé',
    'errors.network': 'Erreur réseau. Veuillez réessayer.',
    'errors.walletNotConnected': 'Veuillez connecter votre portefeuille',
    'errors.insufficientFunds': 'Fonds insuffisants',
    'errors.transactionFailed': 'Transaction échouée',
    'errors.invalidInput': 'Entrée invalide',
  },
  de: {
    'common.loading': 'Laden...',
    'common.error': 'Fehler',
    'common.success': 'Erfolg',
    'common.cancel': 'Abbrechen',
    'common.confirm': 'Bestätigen',
    'common.save': 'Speichern',
    'common.delete': 'Löschen',
    'common.edit': 'Bearbeiten',
    'common.create': 'Erstellen',
    'common.close': 'Schließen',
    'common.back': 'Zurück',
    'common.next': 'Weiter',
    'common.search': 'Suchen',
    'common.filter': 'Filtern',
    'common.sort': 'Sortieren',
    'common.refresh': 'Aktualisieren',
    'common.noResults': 'Keine Ergebnisse gefunden',
    'common.viewAll': 'Alle Anzeigen',
    'common.learnMore': 'Mehr Erfahren',
    'nav.home': 'Startseite',
    'nav.positions': 'Positionen',
    'nav.staking': 'Staking',
    'nav.governance': 'Governance',
    'nav.profile': 'Profil',
    'nav.settings': 'Einstellungen',
    'wallet.connect': 'Wallet Verbinden',
    'wallet.disconnect': 'Trennen',
    'wallet.connected': 'Verbunden',
    'wallet.notConnected': 'Nicht Verbunden',
    'wallet.balance': 'Guthaben',
    'wallet.copyAddress': 'Adresse Kopieren',
    'wallet.addressCopied': 'Adresse Kopiert!',
    'positions.title': 'Ihre Positionen',
    'positions.create': 'Position Erstellen',
    'positions.createNew': 'Neue Position Erstellen',
    'positions.noPositions': 'Noch keine Positionen',
    'positions.locked': 'Gesperrt',
    'positions.unlocking': 'Entsperren',
    'positions.unlocked': 'Entsperrt',
    'positions.cancelled': 'Storniert',
    'positions.amount': 'Betrag',
    'positions.unlockDate': 'Entsperrdatum',
    'positions.beneficiary': 'Begünstigter',
    'positions.withdraw': 'Abheben',
    'positions.transfer': 'Übertragen',
    'positions.details': 'Details Anzeigen',
    'staking.title': 'Staking',
    'staking.stake': 'Einsetzen',
    'staking.unstake': 'Abheben',
    'staking.claim': 'Belohnungen Beanspruchen',
    'staking.rewards': 'Belohnungen',
    'staking.totalStaked': 'Gesamt Eingesetzt',
    'staking.yourStake': 'Ihr Einsatz',
    'staking.tier': 'Stufe',
    'staking.apy': 'APY',
    'governance.title': 'Governance',
    'governance.proposals': 'Vorschläge',
    'governance.createProposal': 'Vorschlag Erstellen',
    'governance.vote': 'Abstimmen',
    'governance.voteFor': 'Dafür Stimmen',
    'governance.voteAgainst': 'Dagegen Stimmen',
    'governance.abstain': 'Enthalten',
    'governance.votingPower': 'Stimmrecht',
    'governance.delegate': 'Delegieren',
    'governance.active': 'Aktiv',
    'governance.passed': 'Angenommen',
    'governance.rejected': 'Abgelehnt',
    'governance.executed': 'Ausgeführt',
    'time.seconds': 'Sekunden',
    'time.minutes': 'Minuten',
    'time.hours': 'Stunden',
    'time.days': 'Tage',
    'time.weeks': 'Wochen',
    'time.months': 'Monate',
    'time.years': 'Jahre',
    'time.ago': 'vor',
    'time.remaining': 'verbleibend',
    'errors.generic': 'Etwas ist schief gelaufen',
    'errors.network': 'Netzwerkfehler. Bitte versuchen Sie es erneut.',
    'errors.walletNotConnected': 'Bitte verbinden Sie Ihr Wallet',
    'errors.insufficientFunds': 'Unzureichende Mittel',
    'errors.transactionFailed': 'Transaktion fehlgeschlagen',
    'errors.invalidInput': 'Ungültige Eingabe',
  },
  ja: {
    'common.loading': '読み込み中...',
    'common.error': 'エラー',
    'common.success': '成功',
    'common.cancel': 'キャンセル',
    'common.confirm': '確認',
    'common.save': '保存',
    'common.delete': '削除',
    'common.edit': '編集',
    'common.create': '作成',
    'common.close': '閉じる',
    'common.back': '戻る',
    'common.next': '次へ',
    'common.search': '検索',
    'common.filter': 'フィルター',
    'common.sort': '並び替え',
    'common.refresh': '更新',
    'common.noResults': '結果が見つかりません',
    'common.viewAll': 'すべて表示',
    'common.learnMore': '詳細',
    'nav.home': 'ホーム',
    'nav.positions': 'ポジション',
    'nav.staking': 'ステーキング',
    'nav.governance': 'ガバナンス',
    'nav.profile': 'プロフィール',
    'nav.settings': '設定',
    'wallet.connect': 'ウォレット接続',
    'wallet.disconnect': '切断',
    'wallet.connected': '接続済み',
    'wallet.notConnected': '未接続',
    'wallet.balance': '残高',
    'wallet.copyAddress': 'アドレスをコピー',
    'wallet.addressCopied': 'アドレスをコピーしました！',
    'positions.title': 'あなたのポジション',
    'positions.create': 'ポジション作成',
    'positions.createNew': '新規ポジション作成',
    'positions.noPositions': 'ポジションはまだありません',
    'positions.locked': 'ロック中',
    'positions.unlocking': 'アンロック中',
    'positions.unlocked': 'アンロック済み',
    'positions.cancelled': 'キャンセル済み',
    'positions.amount': '金額',
    'positions.unlockDate': 'アンロック日',
    'positions.beneficiary': '受益者',
    'positions.withdraw': '引き出し',
    'positions.transfer': '転送',
    'positions.details': '詳細を見る',
    'staking.title': 'ステーキング',
    'staking.stake': 'ステーク',
    'staking.unstake': 'アンステーク',
    'staking.claim': '報酬を請求',
    'staking.rewards': '報酬',
    'staking.totalStaked': '総ステーク量',
    'staking.yourStake': 'あなたのステーク',
    'staking.tier': 'ティア',
    'staking.apy': 'APY',
    'governance.title': 'ガバナンス',
    'governance.proposals': '提案',
    'governance.createProposal': '提案作成',
    'governance.vote': '投票',
    'governance.voteFor': '賛成',
    'governance.voteAgainst': '反対',
    'governance.abstain': '棄権',
    'governance.votingPower': '投票権',
    'governance.delegate': '委任',
    'governance.active': 'アクティブ',
    'governance.passed': '可決',
    'governance.rejected': '否決',
    'governance.executed': '実行済み',
    'time.seconds': '秒',
    'time.minutes': '分',
    'time.hours': '時間',
    'time.days': '日',
    'time.weeks': '週間',
    'time.months': 'ヶ月',
    'time.years': '年',
    'time.ago': '前',
    'time.remaining': '残り',
    'errors.generic': '問題が発生しました',
    'errors.network': 'ネットワークエラー。再試行してください。',
    'errors.walletNotConnected': 'ウォレットを接続してください',
    'errors.insufficientFunds': '残高不足',
    'errors.transactionFailed': 'トランザクション失敗',
    'errors.invalidInput': '無効な入力',
  },
  zh: {
    'common.loading': '加载中...',
    'common.error': '错误',
    'common.success': '成功',
    'common.cancel': '取消',
    'common.confirm': '确认',
    'common.save': '保存',
    'common.delete': '删除',
    'common.edit': '编辑',
    'common.create': '创建',
    'common.close': '关闭',
    'common.back': '返回',
    'common.next': '下一步',
    'common.search': '搜索',
    'common.filter': '筛选',
    'common.sort': '排序',
    'common.refresh': '刷新',
    'common.noResults': '未找到结果',
    'common.viewAll': '查看全部',
    'common.learnMore': '了解更多',
    'nav.home': '首页',
    'nav.positions': '持仓',
    'nav.staking': '质押',
    'nav.governance': '治理',
    'nav.profile': '个人资料',
    'nav.settings': '设置',
    'wallet.connect': '连接钱包',
    'wallet.disconnect': '断开连接',
    'wallet.connected': '已连接',
    'wallet.notConnected': '未连接',
    'wallet.balance': '余额',
    'wallet.copyAddress': '复制地址',
    'wallet.addressCopied': '地址已复制！',
    'positions.title': '您的持仓',
    'positions.create': '创建持仓',
    'positions.createNew': '创建新持仓',
    'positions.noPositions': '暂无持仓',
    'positions.locked': '锁定中',
    'positions.unlocking': '解锁中',
    'positions.unlocked': '已解锁',
    'positions.cancelled': '已取消',
    'positions.amount': '金额',
    'positions.unlockDate': '解锁日期',
    'positions.beneficiary': '受益人',
    'positions.withdraw': '提取',
    'positions.transfer': '转账',
    'positions.details': '查看详情',
    'staking.title': '质押',
    'staking.stake': '质押',
    'staking.unstake': '取消质押',
    'staking.claim': '领取奖励',
    'staking.rewards': '奖励',
    'staking.totalStaked': '总质押量',
    'staking.yourStake': '您的质押',
    'staking.tier': '等级',
    'staking.apy': 'APY',
    'governance.title': '治理',
    'governance.proposals': '提案',
    'governance.createProposal': '创建提案',
    'governance.vote': '投票',
    'governance.voteFor': '赞成',
    'governance.voteAgainst': '反对',
    'governance.abstain': '弃权',
    'governance.votingPower': '投票权',
    'governance.delegate': '委托',
    'governance.active': '进行中',
    'governance.passed': '已通过',
    'governance.rejected': '已否决',
    'governance.executed': '已执行',
    'time.seconds': '秒',
    'time.minutes': '分钟',
    'time.hours': '小时',
    'time.days': '天',
    'time.weeks': '周',
    'time.months': '个月',
    'time.years': '年',
    'time.ago': '前',
    'time.remaining': '剩余',
    'errors.generic': '出现问题',
    'errors.network': '网络错误，请重试。',
    'errors.walletNotConnected': '请连接您的钱包',
    'errors.insufficientFunds': '余额不足',
    'errors.transactionFailed': '交易失败',
    'errors.invalidInput': '无效输入',
  },
  ko: {
    'common.loading': '로딩 중...',
    'common.error': '오류',
    'common.success': '성공',
    'common.cancel': '취소',
    'common.confirm': '확인',
    'common.save': '저장',
    'common.delete': '삭제',
    'common.edit': '편집',
    'common.create': '생성',
    'common.close': '닫기',
    'common.back': '뒤로',
    'common.next': '다음',
    'common.search': '검색',
    'common.filter': '필터',
    'common.sort': '정렬',
    'common.refresh': '새로고침',
    'common.noResults': '결과가 없습니다',
    'common.viewAll': '모두 보기',
    'common.learnMore': '자세히 보기',
    'nav.home': '홈',
    'nav.positions': '포지션',
    'nav.staking': '스테이킹',
    'nav.governance': '거버넌스',
    'nav.profile': '프로필',
    'nav.settings': '설정',
    'wallet.connect': '지갑 연결',
    'wallet.disconnect': '연결 해제',
    'wallet.connected': '연결됨',
    'wallet.notConnected': '연결 안됨',
    'wallet.balance': '잔액',
    'wallet.copyAddress': '주소 복사',
    'wallet.addressCopied': '주소가 복사되었습니다!',
    'positions.title': '내 포지션',
    'positions.create': '포지션 생성',
    'positions.createNew': '새 포지션 생성',
    'positions.noPositions': '포지션이 없습니다',
    'positions.locked': '잠금',
    'positions.unlocking': '잠금 해제 중',
    'positions.unlocked': '잠금 해제됨',
    'positions.cancelled': '취소됨',
    'positions.amount': '금액',
    'positions.unlockDate': '잠금 해제일',
    'positions.beneficiary': '수혜자',
    'positions.withdraw': '인출',
    'positions.transfer': '전송',
    'positions.details': '상세 보기',
    'staking.title': '스테이킹',
    'staking.stake': '스테이크',
    'staking.unstake': '언스테이크',
    'staking.claim': '보상 청구',
    'staking.rewards': '보상',
    'staking.totalStaked': '총 스테이킹',
    'staking.yourStake': '내 스테이크',
    'staking.tier': '티어',
    'staking.apy': 'APY',
    'governance.title': '거버넌스',
    'governance.proposals': '제안',
    'governance.createProposal': '제안 생성',
    'governance.vote': '투표',
    'governance.voteFor': '찬성',
    'governance.voteAgainst': '반대',
    'governance.abstain': '기권',
    'governance.votingPower': '투표권',
    'governance.delegate': '위임',
    'governance.active': '진행 중',
    'governance.passed': '통과',
    'governance.rejected': '거부',
    'governance.executed': '실행됨',
    'time.seconds': '초',
    'time.minutes': '분',
    'time.hours': '시간',
    'time.days': '일',
    'time.weeks': '주',
    'time.months': '개월',
    'time.years': '년',
    'time.ago': '전',
    'time.remaining': '남음',
    'errors.generic': '문제가 발생했습니다',
    'errors.network': '네트워크 오류. 다시 시도해주세요.',
    'errors.walletNotConnected': '지갑을 연결해주세요',
    'errors.insufficientFunds': '잔액 부족',
    'errors.transactionFailed': '트랜잭션 실패',
    'errors.invalidInput': '잘못된 입력',
  },
  pt: {
    'common.loading': 'Carregando...',
    'common.error': 'Erro',
    'common.success': 'Sucesso',
    'common.cancel': 'Cancelar',
    'common.confirm': 'Confirmar',
    'common.save': 'Salvar',
    'common.delete': 'Excluir',
    'common.edit': 'Editar',
    'common.create': 'Criar',
    'common.close': 'Fechar',
    'common.back': 'Voltar',
    'common.next': 'Próximo',
    'common.search': 'Pesquisar',
    'common.filter': 'Filtrar',
    'common.sort': 'Ordenar',
    'common.refresh': 'Atualizar',
    'common.noResults': 'Nenhum resultado encontrado',
    'common.viewAll': 'Ver Tudo',
    'common.learnMore': 'Saiba Mais',
    'nav.home': 'Início',
    'nav.positions': 'Posições',
    'nav.staking': 'Staking',
    'nav.governance': 'Governança',
    'nav.profile': 'Perfil',
    'nav.settings': 'Configurações',
    'wallet.connect': 'Conectar Carteira',
    'wallet.disconnect': 'Desconectar',
    'wallet.connected': 'Conectado',
    'wallet.notConnected': 'Não Conectado',
    'wallet.balance': 'Saldo',
    'wallet.copyAddress': 'Copiar Endereço',
    'wallet.addressCopied': 'Endereço Copiado!',
    'positions.title': 'Suas Posições',
    'positions.create': 'Criar Posição',
    'positions.createNew': 'Criar Nova Posição',
    'positions.noPositions': 'Nenhuma posição ainda',
    'positions.locked': 'Bloqueado',
    'positions.unlocking': 'Desbloqueando',
    'positions.unlocked': 'Desbloqueado',
    'positions.cancelled': 'Cancelado',
    'positions.amount': 'Valor',
    'positions.unlockDate': 'Data de Desbloqueio',
    'positions.beneficiary': 'Beneficiário',
    'positions.withdraw': 'Sacar',
    'positions.transfer': 'Transferir',
    'positions.details': 'Ver Detalhes',
    'staking.title': 'Staking',
    'staking.stake': 'Depositar',
    'staking.unstake': 'Retirar',
    'staking.claim': 'Resgatar Recompensas',
    'staking.rewards': 'Recompensas',
    'staking.totalStaked': 'Total Depositado',
    'staking.yourStake': 'Seu Depósito',
    'staking.tier': 'Nível',
    'staking.apy': 'APY',
    'governance.title': 'Governança',
    'governance.proposals': 'Propostas',
    'governance.createProposal': 'Criar Proposta',
    'governance.vote': 'Votar',
    'governance.voteFor': 'Votar a Favor',
    'governance.voteAgainst': 'Votar Contra',
    'governance.abstain': 'Abster-se',
    'governance.votingPower': 'Poder de Voto',
    'governance.delegate': 'Delegar',
    'governance.active': 'Ativo',
    'governance.passed': 'Aprovado',
    'governance.rejected': 'Rejeitado',
    'governance.executed': 'Executado',
    'time.seconds': 'segundos',
    'time.minutes': 'minutos',
    'time.hours': 'horas',
    'time.days': 'dias',
    'time.weeks': 'semanas',
    'time.months': 'meses',
    'time.years': 'anos',
    'time.ago': 'atrás',
    'time.remaining': 'restante',
    'errors.generic': 'Algo deu errado',
    'errors.network': 'Erro de rede. Por favor tente novamente.',
    'errors.walletNotConnected': 'Por favor conecte sua carteira',
    'errors.insufficientFunds': 'Saldo insuficiente',
    'errors.transactionFailed': 'Transação falhou',
    'errors.invalidInput': 'Entrada inválida',
  },
};

// ============================================================================
// Context
// ============================================================================

interface I18nContextValue {
  locale: SupportedLocale;
  localeConfig: LocaleConfig;
  setLocale: (locale: SupportedLocale) => void;
  t: (key: TranslationKey, values?: TranslationValues) => string;
  formatNumber: (value: number) => string;
  formatCurrency: (value: number, currency?: string) => string;
  formatDate: (date: Date | number) => string;
  formatRelativeTime: (date: Date | number) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export const useI18n = (): I18nContextValue => {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
};

// ============================================================================
// Provider
// ============================================================================

interface I18nProviderProps {
  children: React.ReactNode;
  defaultLocale?: SupportedLocale;
}

export const I18nProvider: React.FC<I18nProviderProps> = ({
  children,
  defaultLocale = 'en',
}) => {
  const [locale, setLocaleState] = useLocalStorage<SupportedLocale>('timelock-locale', defaultLocale);
  const localeConfig = LOCALE_CONFIGS[locale];

  // Detect browser locale on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && !localStorage.getItem('timelock-locale')) {
      const browserLang = navigator.language.split('-')[0] as SupportedLocale;
      if (browserLang in LOCALE_CONFIGS) {
        setLocaleState(browserLang);
      }
    }
  }, [setLocaleState]);

  const setLocale = useCallback(
    (newLocale: SupportedLocale) => {
      setLocaleState(newLocale);
      document.documentElement.lang = newLocale;
    },
    [setLocaleState]
  );

  // Translation function
  const t = useCallback(
    (key: TranslationKey, values?: TranslationValues): string => {
      let text = translations[locale][key] || translations.en[key] || key;

      if (values) {
        Object.entries(values).forEach(([k, v]) => {
          text = text.replace(new RegExp(`{{${k}}}`, 'g'), String(v));
        });
      }

      return text;
    },
    [locale]
  );

  // Number formatting
  const formatNumber = useCallback(
    (value: number): string => {
      return new Intl.NumberFormat(locale).format(value);
    },
    [locale]
  );

  // Currency formatting
  const formatCurrency = useCallback(
    (value: number, currency = 'STX'): string => {
      if (currency === 'STX') {
        return `${formatNumber(value)} STX`;
      }
      return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency,
      }).format(value);
    },
    [locale, formatNumber]
  );

  // Date formatting
  const formatDate = useCallback(
    (date: Date | number): string => {
      const d = typeof date === 'number' ? new Date(date) : date;
      return new Intl.DateTimeFormat(locale, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      }).format(d);
    },
    [locale]
  );

  // Relative time formatting
  const formatRelativeTime = useCallback(
    (date: Date | number): string => {
      const d = typeof date === 'number' ? new Date(date) : date;
      const now = Date.now();
      const diff = now - d.getTime();
      const absDiff = Math.abs(diff);

      const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });

      if (absDiff < 60000) {
        return rtf.format(-Math.round(diff / 1000), 'second');
      } else if (absDiff < 3600000) {
        return rtf.format(-Math.round(diff / 60000), 'minute');
      } else if (absDiff < 86400000) {
        return rtf.format(-Math.round(diff / 3600000), 'hour');
      } else if (absDiff < 2592000000) {
        return rtf.format(-Math.round(diff / 86400000), 'day');
      } else if (absDiff < 31536000000) {
        return rtf.format(-Math.round(diff / 2592000000), 'month');
      } else {
        return rtf.format(-Math.round(diff / 31536000000), 'year');
      }
    },
    [locale]
  );

  const value: I18nContextValue = {
    locale,
    localeConfig,
    setLocale,
    t,
    formatNumber,
    formatCurrency,
    formatDate,
    formatRelativeTime,
  };

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
};

export default I18nProvider;
