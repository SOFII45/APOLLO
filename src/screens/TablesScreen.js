import React, { useState, useCallback, useRef } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, useWindowDimensions,
  ActivityIndicator, StatusBar, ScrollView
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import { getTables, getOpenOrders } from '../services/api';
import { C, F, R, S } from '../constants/theme';
import PinModal from '../components/PinModal';
import usePolling from '../hooks/usePolling';

// ── Table display helpers ─────────────────────────────────────────────────────

function getTableColor(t, hasItems) {
  if (t.table_type === 'guest')    return { bg: C.purple,  border: C.purpleDark };
  if (t.table_type === 'delivery') return { bg: C.blue,    border: C.blueDark };
  if (t.status === 'occupied' && hasItems) return { bg: C.red, border: C.redDark };
  return { bg: C.green, border: C.greenDark };
}

function getTableLabel(t) {
  if (t.table_type === 'guest')    return 'Misafir';
  if (t.table_type === 'delivery') return `Kurye\n${t.table_number}`;
  return `Masa\n${t.table_number}`;
}

function getTableStatus(t, hasItems) {
  return (t.status === 'occupied' && hasItems) ? 'Dolu' : 'Boş';
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function TablesScreen({ navigation }) {
  const { width } = useWindowDimensions();
  const columns   = width < 480 ? 2 : width < 768 ? 3 : 4;

  const [tables,   setTables]   = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [pressing] = useState(null);
  const [pinVisible, setPinVisible] = useState(false);

  const orderDetails = useRef({});

  // ── Data fetch ──────────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    try {
      const [tbl, orders] = await Promise.all([getTables(), getOpenOrders()]);

      const map = {};
      orders.forEach(o => { 
        if (!o.is_paid) {
          map[o.table] = {
            id: o.id,
            hasItems: o.items && o.items.length > 0
          };
        } 
      });
      orderDetails.current = map;
      setTables(tbl);
    } catch {
      // Silently ignore polling errors
    } finally {
      setLoading(false);
    }
  }, []);

  const [focused, setFocused] = useState(true);
  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      fetchData();
      return () => setFocused(false);
    }, [fetchData])
  );
  usePolling(fetchData, 3000, focused);

  // ── Press handler ───────────────────────────────────────────────────────────
  const handlePress = (table) => {
    const existingOrder = orderDetails.current[table.id];
    navigation.navigate('Order', {
      orderId:   existingOrder ? existingOrder.id : null,
      tableId:   table.id,
      tableName: getTableLabel(table).replace('\n', ' '),
    });
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  const renderTable = ({ item }) => {
    const tableInfo = orderDetails.current[item.id];
    const hasItems = tableInfo?.hasItems;
    const { bg, border } = getTableColor(item, hasItems);
    const isLoading = pressing === item.id;
    const cardSize  = (width - (columns + 1) * 12) / columns;

    return (
      <TouchableOpacity
        style={[
          styles.card,
          {
            backgroundColor: bg,
            borderColor: border,
            width: cardSize,
            height: cardSize * 0.82,
          },
          S.card,
        ]}
        onPress={() => handlePress(item)}
        activeOpacity={0.78}
        disabled={!!pressing}
      >
        {isLoading ? (
          <ActivityIndicator color={C.white} size="large" />
        ) : (
          <>
            <Text style={styles.cardNum}>{getTableLabel(item)}</Text>
            <View style={[styles.statusBadge, (item.status === 'occupied' && hasItems) && styles.statusBadgeOcc]}>
              <Text style={styles.statusTxt}>{getTableStatus(item, hasItems)}</Text>
            </View>
            {hasItems && (
              <View style={styles.dotBadge} />
            )}
          </>
        )}
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={C.amber} />
        <Text style={styles.loadTxt}>Masalar yükleniyor…</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={C.bgDark} />

      <View style={styles.headerBar}>
        <View>
          <Text style={styles.headerTitle}>☕ Kafe POS</Text>
          <Text style={styles.headerSub}>{tables.length} masa</Text>
        </View>
        <div style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: '10px' }}>
          {[
            { color: C.green,  label: 'Boş' },
            { color: C.red,    label: 'Dolu' },
            { color: C.purple, label: 'Misafir' },
            { color: C.blue,   label: 'Teslimat' },
          ].map(l => (
            <View key={l.label} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: l.color }]} />
              <Text style={styles.legendTxt}>{l.label}</Text>
            </View>
          ))}
        </div>
      </View>

      {/* WEB İÇİN KAYDIRMA DESTEĞİ EKLENDİ */}
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={true}
      >
        <FlatList
          data={tables}
          keyExtractor={t => String(t.id)}
          numColumns={columns}
          key={`grid-${columns}`}
          contentContainerStyle={styles.grid}
          renderItem={renderTable}
          scrollEnabled={false} // Kaydırma işlemini dıştaki ScrollView yapıyor
        />

        {/* ADMIN BUTONU ARTIK SAYFANIN SONUNDA VE HER ZAMAN ERİŞİLEBİLİR */}
        <TouchableOpacity
          style={styles.adminBtnWeb}
          onPress={() => setPinVisible(true)}
          activeOpacity={0.8}
        >
          <Text style={styles.adminTxt}>⚙️  Admin Paneline Giriş Yap</Text>
        </TouchableOpacity>
      </ScrollView>

      <PinModal
        visible={pinVisible}
        onClose={() => setPinVisible(false)}
        onSuccess={() => { setPinVisible(false); navigation.navigate('Admin'); }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bgDark },
  scrollContent: { flexGrow: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.bgDark, gap: 12 },
  loadTxt: { color: C.txtSecond, fontSize: F.md },
  headerBar: {
    backgroundColor: C.bgMid,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderColor: C.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  headerTitle: { fontSize: F.xl, fontWeight: '800', color: C.txtPrimary, letterSpacing: 0.5 },
  headerSub: { fontSize: F.sm, color: C.txtSecond, marginTop: 2 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot:  { width: 10, height: 10, borderRadius: 5 },
  legendTxt:  { fontSize: F.xs, color: C.txtSecond },
  grid: { padding: 12, gap: 12 },
  card: {
    margin: 0,
    borderRadius: R.lg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    padding: 10,
    overflow: 'hidden',
  },
  cardNum: {
    color: C.white,
    fontSize: F.xl,
    fontWeight: '900',
    textAlign: 'center',
    letterSpacing: 0.3,
    lineHeight: F.xl * 1.25,
  },
  statusBadge: {
    marginTop: 8,
    backgroundColor: 'rgba(255,255,255,0.20)',
    borderRadius: R.full,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  statusBadgeOcc: { backgroundColor: 'rgba(0,0,0,0.22)' },
  statusTxt: { color: C.white, fontSize: F.xs, fontWeight: '700' },
  dotBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: C.amber,
    borderWidth: 1.5,
    borderColor: C.white,
  },
  // WEB İÇİN ÖZEL BUTON STİLİ
  adminBtnWeb: {
    backgroundColor: C.bgMid,
    borderRadius: R.lg,
    paddingHorizontal: 20,
    paddingVertical: 18,
    marginHorizontal: 16,
    marginVertical: 30, // Altta ve üstte boşluk bırakır
    alignItems: 'center',
    borderWidth: 1,
    borderColor: C.border,
    ...S.card,
  },
  adminTxt: { color: C.txtPrimary, fontWeight: '700', fontSize: F.md },
});
