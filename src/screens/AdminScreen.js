import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  TextInput, StyleSheet, ActivityIndicator,
  Alert, Linking, Platform
} from 'react-native';
import {
  getProducts, getCategories, createProduct, updateProduct, deleteProduct,
  createCategory, deleteCategory, getDailyReport, getMonthlyReport, extractError,
} from '../services/api';
import { C, F, R } from '../constants/theme';

const TABS = [
  { key: 'products',   label: 'Ürünler' },
  { key: 'categories', label: 'Kategoriler' },
  { key: 'daily',      label: 'Günlük Rapor' },
  { key: 'monthly',    label: 'Aylık Rapor' },
];

const fmt = (v) => `₺${Number(v || 0).toFixed(2)}`;
const todayStr = () => new Date().toISOString().split('T')[0];
const BASE_URL = "https://apollo45.pythonanywhere.com/api/";

export default function AdminScreen() {
  const [activeTab, setActiveTab] = useState('products');

  return (
    <View style={styles.root}>
      {/* HEADER */}
      <View style={styles.header}>
        <Text style={styles.title}>⚙ Admin Panel</Text>
      </View>

      {/* TABS */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabBar}
        contentContainerStyle={styles.tabBarContent}
      >
        {TABS.map(t => (
          <TouchableOpacity
            key={t.key}
            style={[styles.tab, activeTab === t.key && styles.tabActive]}
            onPress={() => setActiveTab(t.key)}
          >
            <Text style={[styles.tabTxt, activeTab === t.key && styles.tabTxtActive]}>
              {t.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* CONTENT */}
      <ScrollView style={{ flex: 1 }}>
        <View style={styles.container}>
          {activeTab === 'products'   && <ProductsTab />}
          {activeTab === 'categories' && <CategoriesTab />}
          {activeTab === 'daily'      && <DailyTab />}
          {activeTab === 'monthly'    && <MonthlyTab />}
        </View>
      </ScrollView>
    </View>
  );
}

////////////////////////////////////////////////////////////////////////
// PRODUCTS
////////////////////////////////////////////////////////////////////////

function ProductsTab() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  const [newName, setNewName] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [newCatId, setNewCatId] = useState(null);
  const [editingId, setEditingId] = useState(null);

  const load = useCallback(async () => {
    try {
      const [p, c] = await Promise.all([getProducts(), getCategories()]);
      setProducts(p);
      setCategories(c);
      if (c.length > 0 && !newCatId) setNewCatId(c[0].id);
    } catch (e) { Alert.alert('Hata', extractError(e)); }
    finally { setLoading(false); }
  }, [newCatId]);

  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    if (!newName || !newPrice || !newCatId) {
      Alert.alert("Hata", "Bilgileri doldur.");
      return;
    }

    const payload = {
      name: newName.trim(),
      price: parseFloat(newPrice).toFixed(2),
      category: newCatId
    };

    try {
      if (editingId) {
        await updateProduct(editingId, payload);
      } else {
        await createProduct(payload);
      }
      setNewName('');
      setNewPrice('');
      setEditingId(null);
      load();
    } catch (e) { Alert.alert('Hata', extractError(e)); }
  };

  const handleDelete = async (id) => {
    await deleteProduct(id);
    load();
  };

  if (loading) return <Loader />;

  return (
    <>
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>
          {editingId ? "Ürünü Düzenle" : "Yeni Ürün"}
        </Text>

        <TextInput
          style={styles.input}
          placeholder="Ürün Adı"
          value={newName}
          onChangeText={setNewName}
          placeholderTextColor={C.txtDim}
        />
        <TextInput
          style={styles.input}
          placeholder="Fiyat"
          value={newPrice}
          onChangeText={setNewPrice}
          keyboardType="numeric"
          placeholderTextColor={C.txtDim}
        />

        <TouchableOpacity style={styles.primaryBtn} onPress={handleSave}>
          <Text style={styles.primaryBtnTxt}>Kaydet</Text>
        </TouchableOpacity>
      </View>

      {products.map(p => (
        <View key={p.id} style={styles.itemRow}>
          <Text style={styles.productName}>{p.name}</Text>
          <Text style={styles.price}>{fmt(p.price)}</Text>
          <TouchableOpacity onPress={() => handleDelete(p.id)}>
            <Text style={{ fontSize: 18 }}>🗑</Text>
          </TouchableOpacity>
        </View>
      ))}
    </>
  );
}

////////////////////////////////////////////////////////////////////////
// CATEGORIES
////////////////////////////////////////////////////////////////////////

function CategoriesTab() {
  const [cats, setCats] = useState([]);
  const [newName, setNewName] = useState('');

  const load = async () => {
    const data = await getCategories();
    setCats(data);
  };

  useEffect(() => { load(); }, []);

  const handleAdd = async () => {
    if (!newName) return;
    await createCategory({ name: newName });
    setNewName('');
    load();
  };

  return (
    <>
      <View style={styles.card}>
        <TextInput
          style={styles.input}
          placeholder="Kategori Adı"
          value={newName}
          onChangeText={setNewName}
          placeholderTextColor={C.txtDim}
        />
        <TouchableOpacity style={styles.primaryBtn} onPress={handleAdd}>
          <Text style={styles.primaryBtnTxt}>Ekle</Text>
        </TouchableOpacity>
      </View>

      {cats.map(c => (
        <View key={c.id} style={styles.itemRow}>
          <Text style={styles.productName}>{c.name}</Text>
        </View>
      ))}
    </>
  );
}

////////////////////////////////////////////////////////////////////////
// DAILY
////////////////////////////////////////////////////////////////////////

function DailyTab() {
  const [dateStr, setDateStr] = useState(todayStr());
  const [report, setReport] = useState(null);

  const fetch = async () => {
    const data = await getDailyReport(dateStr);
    setReport(data);
  };

  const downloadPdf = () => {
    Linking.openURL(`${BASE_URL}reports/daily-pdf/?date=${dateStr}`);
  };

  useEffect(() => { fetch(); }, []);

  return (
    <>
      <View style={styles.cardRow}>
        <TextInput style={styles.input} value={dateStr} onChangeText={setDateStr} />
        <TouchableOpacity style={styles.primaryBtn} onPress={fetch}>
          <Text style={styles.primaryBtnTxt}>Getir</Text>
        </TouchableOpacity>
      </View>

      {report && (
        <>
          <TouchableOpacity style={styles.pdfBtn} onPress={downloadPdf}>
            <Text style={styles.pdfBtnTxt}>PDF İndir</Text>
          </TouchableOpacity>

          <ReportGrid report={report} />
        </>
      )}
    </>
  );
}

////////////////////////////////////////////////////////////////////////
// MONTHLY
////////////////////////////////////////////////////////////////////////

function MonthlyTab() {
  const now = new Date();
  const [year, setYear] = useState(String(now.getFullYear()));
  const [month, setMonth] = useState(String(now.getMonth()+1));
  const [report, setReport] = useState(null);

  const fetch = async () => {
    const data = await getMonthlyReport(year, month);
    setReport(data);
  };

  const downloadPdf = () => {
    Linking.openURL(`${BASE_URL}reports/monthly-pdf/?year=${year}&month=${month}`);
  };

  useEffect(() => { fetch(); }, []);

  return (
    <>
      <View style={styles.cardRow}>
        <TextInput style={styles.input} value={year} onChangeText={setYear} />
        <TextInput style={styles.input} value={month} onChangeText={setMonth} />
        <TouchableOpacity style={styles.primaryBtn} onPress={fetch}>
          <Text style={styles.primaryBtnTxt}>Getir</Text>
        </TouchableOpacity>
      </View>

      {report && (
        <>
          <TouchableOpacity style={styles.pdfBtn} onPress={downloadPdf}>
            <Text style={styles.pdfBtnTxt}>PDF İndir</Text>
          </TouchableOpacity>

          <ReportGrid report={report} />
        </>
      )}
    </>
  );
}

////////////////////////////////////////////////////////////////////////
// REPORT GRID
////////////////////////////////////////////////////////////////////////

function ReportGrid({ report }) {
  return (
    <View style={styles.grid}>
      {[
        ['Salon', report.salon],
        ['Misafir', report.misafir],
        ['Trendyol', report.trendyol],
        ['Getir', report.getir],
        ['Kurye', report.kurye],
        ['Toplam', report.total_revenue],
      ].map(([label, value]) => (
        <View key={label} style={styles.statBox}>
          <Text style={styles.statLabel}>{label}</Text>
          <Text style={styles.statVal}>{fmt(value)}</Text>
        </View>
      ))}
    </View>
  );
}

function Loader() {
  return <ActivityIndicator size="large" color={C.amber} />;
}

////////////////////////////////////////////////////////////////////////
// STYLES
////////////////////////////////////////////////////////////////////////

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#111827' },
  header: { padding: 20, borderBottomWidth: 1, borderColor: '#1F2937' },
  title: { color: '#FFF', fontSize: 24, fontWeight: '800' },
  container: { maxWidth: 1100, alignSelf: 'center', width: '100%', padding: 20 },
  tabBar: { backgroundColor: '#1F2937' },
  tabBarContent: { padding: 10, gap: 10 },
  tab: { paddingHorizontal: 18, paddingVertical: 8, borderRadius: 20, backgroundColor: '#374151' },
  tabActive: { backgroundColor: '#F59E0B' },
  tabTxt: { color: '#D1D5DB', fontWeight: '700' },
  tabTxtActive: { color: '#111827' },
  card: { backgroundColor: '#1F2937', padding: 20, borderRadius: 12, marginBottom: 20 },
  sectionTitle: { color: '#F59E0B', fontWeight: '800', marginBottom: 10 },
  input: { backgroundColor: '#374151', padding: 12, borderRadius: 8, marginBottom: 10, color: '#FFF' },
  primaryBtn: { backgroundColor: '#F59E0B', padding: 12, borderRadius: 8, alignItems: 'center' },
  primaryBtnTxt: { color: '#111827', fontWeight: '800' },
  itemRow: { backgroundColor: '#1F2937', padding: 14, borderRadius: 10, marginBottom: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  productName: { color: '#FFF', fontWeight: '700' },
  price: { color: '#F59E0B', fontWeight: '800' },
  pdfBtn: { backgroundColor: '#DC2626', padding: 12, borderRadius: 8, alignItems: 'center', marginBottom: 20 },
  pdfBtnTxt: { color: '#FFF', fontWeight: '800' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 15 },
  statBox: { backgroundColor: '#1F2937', padding: 20, borderRadius: 12, width: 160 },
  statLabel: { color: '#9CA3AF', fontSize: 12 },
  statVal: { color: '#FFF', fontSize: 18, fontWeight: '800', marginTop: 5 },
});
