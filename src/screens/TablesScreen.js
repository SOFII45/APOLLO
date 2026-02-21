import React, { useState, useCallback, useRef } from 'react';
import {
  View, Text, TouchableOpacity,
  StyleSheet, useWindowDimensions,
  ActivityIndicator, StatusBar, ScrollView, Platform
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import { getTables, getOpenOrders } from '../services/api';
import { C, F, R, S } from '../constants/theme';
import PinModal from '../components/PinModal';
import usePolling from '../hooks/usePolling';

// ── Yardımcı Fonksiyonlar ─────────────────────────────────────────────────────
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

export default function TablesScreen({ navigation }) {
  const { width } = useWindowDimensions();
  const columns = width < 480 ? 2 : width < 768 ? 3 : 4;
  const cardSize = (width - (columns + 1) * 20) / columns;

  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pinVisible, setPinVisible] = useState(false);
  const orderDetails = useRef({});

  const fetchData = useCallback(async () => {
    try {
      const [tbl, orders] = await Promise.all([getTables(), getOpenOrders()]);
      const map = {};
      orders.forEach(o => { 
        if (!o.is_paid) map[o.table] = { id: o.id, hasItems: o.items?.length > 0 };
      });
      orderDetails.current = map;
      setTables(tbl);
    } catch (e) { console.error(e); } 
    finally { setLoading(false); }
  }, []);

  useFocusEffect(useCallback(() => { fetchData(); }, [fetchData]));
  usePolling(fetchData, 3000, true);

  const handlePress = (table) => {
    const existingOrder = orderDetails.current[table.id];
    navigation.navigate('Order', {
      orderId: existingOrder ? existingOrder.id : null,
      tableId: table.id,
      tableName: getTableLabel(table).replace('\n', ' '),
    });
  };

  if (loading) return (
    <View style={styles.center}><ActivityIndicator size="large" color={C.amber} /></View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* HEADER SABİT OLSUN DİYE SCROLLVIEW DIŞINDA TUTTUK */}
      <View style={styles.headerBar}>
        <View>
          <Text style={styles.headerTitle}>☕ Kafe POS</Text>
          <Text style={styles.headerSub}>{tables.length} masa</Text>
        </View>
        <View style={styles.legendRow}>
          {[{ c: C.green, l: 'Boş' }, { c: C.red, l: 'Dolu' }].map(x => (
            <View key={x.l} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: x.c }]} />
              <Text style={styles.legendTxt}>{x.l}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* ANA KAYDIRICI: Web'de çift çubuğu önlemek için style ayarı yapıldı */}
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={Platform.OS === 'web'}
      >
        <View style={styles.grid}>
          {tables.map((item) => {
            const hasItems = orderDetails.current[item.id]?.hasItems;
            const { bg, border } = getTableColor(item, hasItems);
            return (
              <TouchableOpacity
                key={item.id}
                style={[styles.card, { backgroundColor: bg, borderColor: border, width: cardSize, height: cardSize * 0.85 }]}
                onPress={() => handlePress(item)}
              >
                <Text style={styles.cardNum}>{getTableLabel(item)}</Text>
                {hasItems && <View style={styles.dotBadge} />}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ADMIN BUTONU: Listenin en altında */}
        <TouchableOpacity style={styles.adminBtn} onPress={() => setPinVisible(true)}>
          <Text style={styles.adminTxt}>⚙️ Admin Paneline Giriş</Text>
        </TouchableOpacity>
      </ScrollView>

      <PinModal visible={pinVisible} onClose={() => setPinVisible(false)} 
                onSuccess={() => { setPinVisible(false); navigation.navigate('Admin'); }} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bgDark },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: C.bgDark },
  headerBar: { 
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 16, backgroundColor: C.bgMid, borderBottomWidth: 1, borderColor: C.border 
  },
  headerTitle: { fontSize: F.xl, fontWeight: '800', color: C.txtPrimary },
  headerSub: { fontSize: F.sm, color: C.txtSecond },
  legendRow: { flexDirection: 'row', gap: 8 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendTxt: { fontSize: F.xs, color: C.txtSecond },
  
  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: 60 }, // En altta boşluk bırakır
  grid: { flexDirection: 'row', flexWrap: 'wrap', padding: 10, justifyContent: 'flex-start' },
  card: { margin: 5, borderRadius: R.lg, alignItems: 'center', justifyContent: 'center', borderWidth: 2 },
  cardNum: { color: C.white, fontSize: F.lg, fontWeight: '900', textAlign: 'center' },
  dotBadge: { position: 'absolute', top: 8, right: 8, width: 10, height: 10, borderRadius: 5, backgroundColor: C.amber, borderWidth: 1.5, borderColor: C.white },
  
  adminBtn: { 
    backgroundColor: C.bgMid, margin: 20, padding: 18, borderRadius: R.lg, 
    alignItems: 'center', borderWidth: 1, borderColor: C.border 
  },
  adminTxt: { color: C.txtPrimary, fontWeight: '700' }
});
